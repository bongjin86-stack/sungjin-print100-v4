import { useEffect, useMemo, useState } from "react";

import { calculateReleaseDate } from "@/lib/dateUtils";
// Order creation via server API (price verified server-side)
async function createOrderViaApi(orderData, priceInput) {
  const res = await fetch("/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderData, priceInput }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "주문 생성에 실패했습니다.");
  }
  return data;
}
import {
  calculateBindingPackaging,
  calculatePackaging,
  estimateThickness,
} from "@/lib/packagingCalculator";
import { calculateShippingCost } from "@/lib/shippingCalculator";

import {
  ContactSection,
  DeliverySection,
  PaymentSection,
  TaxDocumentSection,
} from "./CheckoutSections";
import OrderSummary from "./OrderSummary";

export default function Checkout() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({ email: "", phone: "" });

  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    deliveryType: "delivery",
    recipient: "",
    postcode: "",
    address: "",
    addressDetail: "",
    deliveryNote: "",
    quickPaymentType: "cod",
    quickCost: 0,
    taxDocumentType: "none",
    taxBusinessNumber: "",
    taxCompanyName: "",
    taxCeoName: "",
    taxEmail: "",
    taxPhone: "",
    paymentMethod: "bank_transfer",
    agreeTerms: false,
  });

  const [product, setProduct] = useState(null);

  useEffect(() => {
    const savedProduct = sessionStorage.getItem("checkoutProduct");
    if (savedProduct) {
      try {
        setProduct(JSON.parse(savedProduct));
      } catch (e) {
        console.error("상품 데이터 파싱 실패:", e);
        sessionStorage.removeItem("checkoutProduct");
        window.location.href = "/";
      }
    } else {
      window.location.href = "/";
    }
  }, []);

  const packaging = useMemo(() => {
    if (!product) return { boxCount: 1, totalWeight: 0, needsFreight: false };
    // outsourced/books: ProductView에서 계산한 무게 사용
    if (product.estimatedWeight > 0) {
      const w = product.estimatedWeight;
      const BOX_MAX_KG = 20;
      const boxCount = Math.max(1, Math.ceil(w / BOX_MAX_KG));
      return {
        boxCount,
        totalWeight: Math.round(w * 10) / 10,
        needsFreight: w > 30,
      };
    }
    if (product.isBinding) {
      return calculateBindingPackaging(
        product.spec?.quantity || 1,
        product.spec?.pages || 100,
        product.innerWeight || 80,
        product.coverWeight || 200
      );
    }
    const paperWeight = product.paperWeight || 120;
    const paperThickness =
      product.paperThickness || estimateThickness(paperWeight, "snow");
    return calculatePackaging(
      product.spec?.quantity || 100,
      paperThickness,
      paperWeight,
      true
    );
  }, [product]);

  const shippingCost = useMemo(() => {
    if (!product) return 0;
    if (formData.deliveryType === "pickup") return 0;
    if (formData.deliveryType === "quick") {
      if (formData.quickPaymentType === "cod") return 0;
      return formData.quickCost || 0;
    }
    return calculateShippingCost(packaging.boxCount, product.price);
  }, [
    product,
    formData.deliveryType,
    formData.quickPaymentType,
    formData.quickCost,
    packaging.boxCount,
  ]);

  const releaseDate = useMemo(() => {
    if (!product) return "";
    return calculateReleaseDate(product.productionDays || 2);
  }, [product]);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const quickCost =
    formData.deliveryType === "quick" && formData.quickPaymentType === "prepaid"
      ? formData.quickCost
      : 0;
  const totalAmount = product.price + shippingCost + quickCost;

  const validateForm = () => {
    let emailError = "";
    let phoneError = "";
    if (!formData.email) emailError = "이메일을 입력해주세요.";
    else if (!formData.email.includes("@"))
      emailError = "올바른 이메일 형식이 아닙니다. (@를 포함해주세요)";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      emailError = "올바른 이메일 형식이 아닙니다.";
    const cleanedPhone = formData.phone.replace(/[^0-9]/g, "");
    if (!cleanedPhone) phoneError = "휴대폰 번호를 입력해주세요.";
    else if (!cleanedPhone.startsWith("010"))
      phoneError = "010으로 시작하는 번호만 입력 가능합니다.";
    else if (cleanedPhone.length !== 11)
      phoneError = "휴대폰 번호 11자리를 입력해주세요.";
    setErrors((prev) => ({
      email: emailError || prev.email,
      phone: phoneError || prev.phone,
    }));
    return !emailError && !phoneError;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (
      formData.deliveryType === "delivery" &&
      (!formData.recipient || !formData.address)
    ) {
      alert("배송지 정보를 입력해주세요.");
      return;
    }
    if (
      formData.deliveryType === "quick" &&
      (!formData.recipient || !formData.address)
    ) {
      alert("배송지 정보를 입력해주세요.");
      return;
    }
    if (
      formData.deliveryType === "quick" &&
      formData.quickPaymentType === "prepaid" &&
      formData.quickCost === 0
    ) {
      alert("퀵 비용을 입력해주세요.");
      return;
    }
    if (!formData.agreeTerms) {
      alert("이용약관 및 개인정보처리방침에 동의해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        ...formData,
        productAmount: product.price,
        shippingCost,
        totalAmount,
        file: product.file || null,
        fileSkipped: product.fileSkipped || false,
        request: product.request || null,
        items: [
          {
            productName: product.name,
            productType: product.type,
            image: product.image || null,
            textInputs: product.textInputs || null,
            booksSummary: product.booksSummary || null,
            spec: product.spec,
            unitPrice: product.price,
            quantity: 1,
            price: product.price,
            productionDays: product.productionDays,
          },
        ],
      };

      // Price verification input (server recalculates to prevent manipulation)
      const priceInput = {
        customer: product.customerSelection || {},
        qty: product.spec?.quantity || 1,
        productType: product.type || "flyer",
        guidePriceTotal: product.guidePriceTotal || 0,
        // outsourced 서버 검증용 추가 데이터
        ...(product.type === "outsourced" && {
          productId: product.productId,
          books: product.books,
          pages: product.pages,
          designFee: product.designFee,
        }),
      };

      const result = await createOrderViaApi(orderData, priceInput);

      sessionStorage.setItem(
        "orderComplete",
        JSON.stringify({
          orderNumber: result.orderNumber,
          uuid: result.uuid,
          email: formData.email,
          releaseDate: releaseDate,
          product: product,
          productAmount: product.price,
          shippingCost: shippingCost,
          totalAmount: totalAmount,
          deliveryType: formData.deliveryType,
          paymentMethod: formData.paymentMethod,
          recipient: formData.recipient,
        })
      );

      sessionStorage.removeItem("checkoutProduct");
      window.location.href = `/order-complete?orderNumber=${result.orderNumber}`;
    } catch (error) {
      console.error("주문 생성 실패:", error);
      alert("주문 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen text-gray-900">
      <header className="border-b border-[#d9d9d9]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => window.history.back()}
              className="text-sm text-[#8a9292] hover:text-[#222828] flex items-center gap-1 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              뒤로 가기
            </button>
          </div>
          <a
            href="/"
            className="text-lg font-semibold text-[#222828] tracking-tight"
          >
            Sungjin Print
          </a>
          <span className="text-sm text-[#8a9292]">주문서 작성</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-7 order-2 lg:order-1">
            <form onSubmit={handleSubmit}>
              <ContactSection
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                setErrors={setErrors}
              />
              <DeliverySection formData={formData} setFormData={setFormData} />
              <TaxDocumentSection
                formData={formData}
                setFormData={setFormData}
              />
              <PaymentSection formData={formData} setFormData={setFormData} />
              <div className="mb-10">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreeTerms}
                    onChange={(e) =>
                      setFormData({ ...formData, agreeTerms: e.target.checked })
                    }
                    className="mt-1"
                  />
                  <span className="text-sm">
                    <a
                      href="#"
                      className="text-gray-900 underline underline-offset-2"
                    >
                      이용약관
                    </a>{" "}
                    및{" "}
                    <a
                      href="#"
                      className="text-gray-900 underline underline-offset-2"
                    >
                      개인정보처리방침
                    </a>
                    에 동의합니다
                  </span>
                </label>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-[#222828] text-white text-sm font-medium tracking-wide rounded-xl hover:bg-[#4a5050] active:bg-[#0f1111] transition-colors disabled:bg-[#d9d9d9] disabled:text-[#8a9292] disabled:cursor-not-allowed"
              >
                {isSubmitting ? "주문 처리 중..." : "주문하기"}
              </button>
              <p className="text-center text-xs text-[#8a9292] mt-4">
                안전한 결제 · 회원가입 불필요
              </p>
            </form>
          </div>
          <OrderSummary
            product={product}
            shippingCost={shippingCost}
            quickCost={quickCost}
            totalAmount={totalAmount}
            deliveryType={formData.deliveryType}
            quickPaymentType={formData.quickPaymentType}
            packaging={packaging}
            releaseDate={releaseDate}
          />
        </div>
      </main>
    </div>
  );
}

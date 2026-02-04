# Nagi - Astro Theme

Nagi is a production-ready Astro template for business and corporate websites.  
Fully responsive, built with Scss & TypeScript.

[View Demo](https://nagi-6tu.pages.dev/) | [📖 Documentation](https://yohaku.dev/docs)

## Getting Started

```bash

npm install
npm run dev # http://localhost:4321
```

### Deployment

```bash
npm run build  # Creates ./dist/
```

Upload to Cloudflare Pages, Netlify, Vercel, or any static host in manually or Git-based.

## Pages Included

- Home, About, Company, Services
- Contact (+ completion page)
- News (list, single, category)
- Works (list, single, category)
- Privacy Policy
- 404

## Project Structure

```text
/
├── src/
│   ├── config/         # JSON configs (site, menu, FAQ, team, etc.)
│   ├── data/           # Markdown content (news/, works/)
│   ├── components/
│   │   └── sections/   # 19 pre-built sections
│   ├── pages/          # Route pages
│   ├── styles/         # Design tokens, global styles
│   └── types/
│       └── index.d.ts   # TypeScript
├── public/images/      # Static assets
└── astro.config.mjs
```

## Customization

All customization guides, component details, and setup instructions:  
**→ [yohaku.dev/docs](https://yohaku.dev/docs)**

## Commands

| Command           | Action                            |
| ----------------- | --------------------------------- |
| `npm install`     | Install dependencies              |
| `npm run dev`     | Start dev server (localhost:4321) |
| `npm run build`   | Build for production (./dist/)    |
| `npm run preview` | Preview production build          |
| `npm run lint`    | Lint code                         |
| `npm run format`  | Format code with Prettier         |
| `npm run check`   | Lint check + format check         |

## Requirements

- Node.js 22.12.0+
- npm 9.0.0+
- Astro 5.16.0+

## License

This Theme (Template) is licensed, not sold.

- **Personal**: Single project only. Personal or internal use. No client work.
- **Agency**: Up to 3 projects. Client work allowed.

For full terms (prohibited uses, image rights, AI restrictions, license changes), see the included `LICENSE` file or:  
https://yohaku.dev/license/

---

**Need help?** Custom development available at hello@yohaku.dev  
**More themes:** [yohaku.dev](https://yohaku.dev)

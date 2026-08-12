const columns = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Changelog"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms"],
  },
]

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <span className="text-base font-semibold tracking-tight">
              SupplyLens
            </span>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Supplier risk, tracked and explained in real time.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-medium">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} SupplyLens. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default Footer

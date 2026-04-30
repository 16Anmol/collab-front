const links = ["About", "Features", "Contact", "Privacy", "Terms"];

const Footer = () => {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
        <span className="text-sm font-semibold text-foreground">Co Hustle</span>
        <div className="flex flex-wrap justify-center gap-6">
          {links.map((link) => (
            <a
              key={link}
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link}
            </a>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          © 2026 Co Hustle
        </span>
      </div>
    </footer>
  );
};

export default Footer;

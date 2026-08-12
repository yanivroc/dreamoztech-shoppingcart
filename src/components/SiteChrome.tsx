import { Link } from "@tanstack/react-router";
import { Facebook, Twitter, Instagram } from "lucide-react";
import { CartButton } from "./CartButton";
import { StyleSwitcher } from "./StyleSwitcher";


export function SiteHeader({ member }: { member: any }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center">
          {member?.profilePicture ? (
            <img
              src={resolveImg(member.profilePicture) ?? undefined}
              alt={`${member?.memberFullName ?? "DreamozTech"} Logo`}
              className="h-8 w-auto object-contain"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ) : (
            <span className="font-semibold tracking-tight truncate">
              {member?.memberFullName ?? "DreamozTech"}
            </span>
          )}
        </Link>
        <ul className="flex items-center gap-4 text-sm">
          <li><Link to="/" className="hover:text-primary">Home</Link></li>
          <li><Link to="/" hash="products" className="hover:text-primary">Products</Link></li>
          <li><Link to="/" hash="contact" className="hover:text-primary">Contact</Link></li>
          <li><CartButton /></li>
          <li><StyleSwitcher /></li>

          {member?.facebookProfile && (
            <li>
              <a href={member.facebookProfile} target="_blank" rel="noreferrer" aria-label="Facebook">
                <Facebook className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </a>
            </li>
          )}
          {member?.twitterProfile && (
            <li>
              <a href={member.twitterProfile} target="_blank" rel="noreferrer" aria-label="Twitter">
                <Twitter className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </a>
            </li>
          )}
          {member?.instagramProfile && (
            <li>
              <a href={member.instagramProfile} target="_blank" rel="noreferrer" aria-label="Instagram">
                <Instagram className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </a>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}

export function SiteFooter({ member }: { member: any }) {
  const name = member?.memberFullName ?? "DreamozTech";
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto max-w-5xl px-4 py-8 grid gap-8 sm:grid-cols-2">
        <div>
          <h3 className="font-semibold mb-2">{name}</h3>
          <p className="text-sm text-muted-foreground">
            &copy; {year} {name}. All rights reserved.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Shortcuts</h4>
          <ul className="space-y-1 text-sm">
            <li><Link to="/" className="text-muted-foreground hover:text-primary">Home</Link></li>
            <li><Link to="/" hash="products" className="text-muted-foreground hover:text-primary">Products</Link></li>
            <li><Link to="/" hash="contact" className="text-muted-foreground hover:text-primary">Contact</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

const VERCEL_BLOB_TOKEN_RE = /(vercel_blob_[A-Za-z0-9_-]+)/;
const VERCEL_PRIVATE_BLOB_RE = /https:\/\/[^/]+\.private\.blob\.vercel-storage\.com\//i;

function proxyImageUrl(url: string) {
  const encoded = encodeURIComponent(url);
  return `/image?src=${encoded}`;
}

export function resolveImg(path?: string | null) {
  if (!path) return null;
  const resolved = String(path);
  if (!/^https?:\/\//i.test(resolved)) {
    return null;
  }
  return VERCEL_PRIVATE_BLOB_RE.test(resolved) || VERCEL_BLOB_TOKEN_RE.test(resolved)
    ? proxyImageUrl(resolved)
    : resolved;
}

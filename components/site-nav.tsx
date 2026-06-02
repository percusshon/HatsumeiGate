import Link from 'next/link';

const links = [
  { href: '/', label: 'Home' },
  { href: '/login', label: 'Login' },
  { href: '/inventor', label: 'Inventor' },
  { href: '/operator', label: 'Operator' },
  { href: '/company', label: 'Company' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/partner', label: 'Partner' },
  { href: '/admin', label: 'Admin' },
  { href: '/logout', label: 'Logout' }
];

export function SiteNav() {
  return (
    <nav>
      <ul className="flex flex-wrap gap-4 text-sm text-slate-700">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="hover:text-blue-700 hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

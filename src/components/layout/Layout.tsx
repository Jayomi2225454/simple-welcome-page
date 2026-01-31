import { ReactNode, forwardRef } from 'react';
import Header from './Header';
import Footer from './Footer';
import AIChatbot from '@/components/chat/AIChatbot';

interface LayoutProps {
  children: ReactNode;
}

const Layout = forwardRef<HTMLDivElement, LayoutProps>(({ children }, ref) => {
  return (
    <div ref={ref} className="min-h-screen bg-gray-900 flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <AIChatbot />
    </div>
  );
});

Layout.displayName = 'Layout';

export default Layout;

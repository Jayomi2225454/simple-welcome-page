import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import AIChatbot from '@/components/chat/AIChatbot';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <AIChatbot />
    </div>
  );
};

export default Layout;

import { ReactNode, forwardRef, useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import AIChatbot from '@/components/chat/AIChatbot';
import { supabase } from '@/integrations/supabase/client';

interface LayoutProps {
  children: ReactNode;
}

const Layout = forwardRef<HTMLDivElement, LayoutProps>(({ children }, ref) => {
  const [chatbotEnabled, setChatbotEnabled] = useState(false);

  useEffect(() => {
    const fetchSetting = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'ai_chatbot_enabled')
        .single();
      setChatbotEnabled(data?.setting_value === 'true');
    };
    fetchSetting();

    const channel = supabase
      .channel('app_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (payload: any) => {
        if (payload.new?.setting_key === 'ai_chatbot_enabled') {
          setChatbotEnabled(payload.new.setting_value === 'true');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div ref={ref} className="min-h-screen bg-gray-900 flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      {chatbotEnabled && <AIChatbot />}
    </div>
  );
});

Layout.displayName = 'Layout';

export default Layout;

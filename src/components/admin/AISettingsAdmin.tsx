import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bot, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AISettingsAdmin = () => {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSetting();
  }, []);

  const loadSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'ai_chatbot_enabled')
        .maybeSingle();

      if (error) throw error;
      if (data) setAiEnabled(data.setting_value === 'true');
    } catch (error) {
      console.error('Error loading AI setting:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAI = async (enabled: boolean) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ setting_value: enabled ? 'true' : 'false' })
        .eq('setting_key', 'ai_chatbot_enabled');

      if (error) throw error;

      setAiEnabled(enabled);
      toast({
        title: enabled ? 'AI Chatbot Enabled' : 'AI Chatbot Disabled',
        description: enabled 
          ? 'Battle Mitra AI is now visible to users' 
          : 'Battle Mitra AI is now hidden from users',
      });
    } catch (error) {
      console.error('Error updating AI setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update AI setting',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Battle Mitra AI Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
          <div className="space-y-1">
            <Label className="text-white font-medium text-base">Enable AI Chatbot</Label>
            <p className="text-sm text-gray-400">
              {aiEnabled 
                ? 'Battle Mitra AI is currently visible to all users' 
                : 'Battle Mitra AI is currently hidden from users'}
            </p>
          </div>
          <Switch
            checked={aiEnabled}
            onCheckedChange={toggleAI}
            disabled={updating}
          />
        </div>
        <div className={`p-3 rounded-lg text-sm ${aiEnabled ? 'bg-green-500/10 border border-green-500/30 text-green-300' : 'bg-red-500/10 border border-red-500/30 text-red-300'}`}>
          {aiEnabled ? '✅ AI Chatbot is ACTIVE' : '🚫 AI Chatbot is DISABLED'}
        </div>
      </CardContent>
    </Card>
  );
};

export default AISettingsAdmin;

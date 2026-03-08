
-- Support conversations table
CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  user_email text,
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Support messages table
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS for support_conversations
CREATE POLICY "Users can view own conversations"
  ON public.support_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON public.support_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.support_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversations"
  ON public.support_conversations FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all conversations"
  ON public.support_conversations FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS for support_messages
CREATE POLICY "Users can view messages in own conversations"
  ON public.support_messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_conversations
    WHERE id = support_messages.conversation_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can send messages in own conversations"
  ON public.support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.support_conversations
      WHERE id = support_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all messages"
  ON public.support_messages FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can send messages to any conversation"
  ON public.support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    has_role(auth.uid(), 'admin')
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Trigger for updated_at
CREATE TRIGGER set_support_conversations_updated_at
  BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { tournamentRegistrationService, TournamentRegistration } from '@/services/tournamentRegistrationService';

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  placeholder: string | null;
  options: string[] | null;
  display_order: number;
}

interface EditRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: TournamentRegistration;
  tournamentId: string;
  onUpdated: () => void;
}

const EditRegistrationDialog: React.FC<EditRegistrationDialogProps> = ({
  open,
  onOpenChange,
  registration,
  tournamentId,
  onUpdated
}) => {
  const { toast } = useToast();
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [gameId, setGameId] = useState('');
  const [loadingFields, setLoadingFields] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadCustomFields();
      setGameId(registration.game_id || '');
      const existingData = (registration.custom_fields_data as Record<string, string>) || {};
      setCustomFieldValues(existingData);
    }
  }, [open, registration]);

  const loadCustomFields = async () => {
    setLoadingFields(true);
    try {
      const { data, error } = await supabase
        .from('tournament_custom_fields')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCustomFields(data || []);
    } catch (error) {
      console.error('Error loading custom fields:', error);
    } finally {
      setLoadingFields(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSave = async () => {
    // Validate required fields
    for (const field of customFields) {
      if (field.is_required && !customFieldValues[field.field_name]?.trim()) {
        toast({
          title: "Required Field",
          description: `${field.field_label} is required.`,
          variant: "destructive"
        });
        return;
      }
    }

    setSaving(true);
    try {
      await tournamentRegistrationService.updateRegistrationDetails(registration.id, {
        game_id: gameId || registration.game_id,
        custom_fields_data: customFieldValues
      });

      toast({
        title: "Details Updated!",
        description: "Your registration details have been updated successfully.",
      });

      onUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update details.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const renderCustomField = (field: CustomField) => {
    const value = customFieldValues[field.field_name] || '';

    switch (field.field_type) {
      case 'select': {
        const validOptions = field.options?.filter(option => option && option.trim() !== '') || [];
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.field_name, val)}>
            <SelectTrigger className="bg-gray-800/60 border-gray-600 text-white h-11 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
              <SelectValue placeholder={field.placeholder || `Select ${field.field_label}`} />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 z-50">
              {validOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
            placeholder={field.placeholder || ''}
            className="bg-gray-800/60 border-gray-600 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 min-h-[80px]"
          />
        );
      default:
        return (
          <Input
            type={field.field_type === 'number' ? 'number' : field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text'}
            value={value}
            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
            placeholder={field.placeholder || ''}
            className="bg-gray-800/60 border-gray-600 text-white placeholder-gray-500 h-11 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-gray-700/50 max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg font-bold">Edit Registration Details</DialogTitle>
              <p className="text-gray-400 text-sm mt-0.5">Update your game ID and other details</p>
            </div>
          </div>
        </DialogHeader>

        {loadingFields ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Game ID field - always show */}
            <div className="space-y-2">
              <Label className="text-gray-200 font-medium">Game ID / In-Game Name</Label>
              <Input
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Enter your in-game name or ID"
                className="bg-gray-800/60 border-gray-600 text-white placeholder-gray-500 h-11 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
            </div>

            {/* Custom Fields */}
            {customFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label className="text-gray-200 font-medium">
                  {field.field_label}
                  {field.is_required && <span className="text-red-400 ml-1">*</span>}
                </Label>
                {renderCustomField(field)}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditRegistrationDialog;

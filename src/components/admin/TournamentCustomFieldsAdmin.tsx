import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, Save, X, GripVertical, Settings2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomField {
  id: string;
  tournament_id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  placeholder: string | null;
  options: string[] | null;
  display_order: number;
}

interface TournamentCustomFieldsAdminProps {
  tournamentId: string;
  tournamentName: string;
}

const TournamentCustomFieldsAdmin = ({ tournamentId, tournamentName }: TournamentCustomFieldsAdminProps) => {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  // New field form state
  const [newField, setNewField] = useState({
    field_name: '',
    field_label: '',
    field_type: 'text',
    is_required: false,
    placeholder: '',
    options: ''
  });

  useEffect(() => {
    loadFields();
  }, [tournamentId]);

  const loadFields = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_custom_fields')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFields(data || []);
    } catch (error) {
      console.error('Error loading custom fields:', error);
      toast({
        title: 'Error',
        description: 'Failed to load custom fields',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async () => {
    if (!newField.field_name || !newField.field_label) {
      toast({
        title: 'Required Fields',
        description: 'Please fill in field name and label',
        variant: 'destructive'
      });
      return;
    }

    try {
      const fieldData = {
        tournament_id: tournamentId,
        field_name: newField.field_name.toLowerCase().replace(/\s+/g, '_'),
        field_label: newField.field_label,
        field_type: newField.field_type,
        is_required: newField.is_required,
        placeholder: newField.placeholder || null,
        options: newField.field_type === 'select' && newField.options 
          ? newField.options.split(',').map(o => o.trim()) 
          : null,
        display_order: fields.length
      };

      const { error } = await supabase
        .from('tournament_custom_fields')
        .insert([fieldData]);

      if (error) throw error;

      toast({
        title: 'Field Added',
        description: 'Custom field has been added successfully'
      });

      setNewField({
        field_name: '',
        field_label: '',
        field_type: 'text',
        is_required: false,
        placeholder: '',
        options: ''
      });
      setShowAddForm(false);
      loadFields();
    } catch (error) {
      console.error('Error adding field:', error);
      toast({
        title: 'Error',
        description: 'Failed to add custom field',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    try {
      const { error } = await supabase
        .from('tournament_custom_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      toast({
        title: 'Field Deleted',
        description: 'Custom field has been deleted'
      });
      loadFields();
    } catch (error) {
      console.error('Error deleting field:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete custom field',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateField = async (field: CustomField) => {
    try {
      const { error } = await supabase
        .from('tournament_custom_fields')
        .update({
          field_label: field.field_label,
          is_required: field.is_required,
          placeholder: field.placeholder
        })
        .eq('id', field.id);

      if (error) throw error;

      toast({
        title: 'Field Updated',
        description: 'Custom field has been updated'
      });
      setEditingId(null);
      loadFields();
    } catch (error) {
      console.error('Error updating field:', error);
      toast({
        title: 'Error',
        description: 'Failed to update custom field',
        variant: 'destructive'
      });
    }
  };

  const getFieldTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      text: 'bg-blue-500',
      number: 'bg-green-500',
      email: 'bg-purple-500',
      phone: 'bg-yellow-500',
      select: 'bg-pink-500',
      textarea: 'bg-orange-500'
    };
    return <Badge className={colors[type] || 'bg-gray-500'}>{type}</Badge>;
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">Loading custom fields...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Custom Registration Fields - {tournamentName}
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Field
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Field Form */}
        {showAddForm && (
          <Card className="bg-gray-700 border-gray-600">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Field Name (internal)</Label>
                  <Input
                    value={newField.field_name}
                    onChange={(e) => setNewField({ ...newField, field_name: e.target.value })}
                    placeholder="e.g., college_name"
                    className="bg-gray-600 border-gray-500 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Field Label (display)</Label>
                  <Input
                    value={newField.field_label}
                    onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
                    placeholder="e.g., College Name"
                    className="bg-gray-600 border-gray-500 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Field Type</Label>
                  <Select
                    value={newField.field_type}
                    onValueChange={(value) => setNewField({ ...newField, field_type: value })}
                  >
                    <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="select">Dropdown</SelectItem>
                      <SelectItem value="textarea">Text Area</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Placeholder</Label>
                  <Input
                    value={newField.placeholder}
                    onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                    placeholder="Enter placeholder text"
                    className="bg-gray-600 border-gray-500 text-white"
                  />
                </div>
                {newField.field_type === 'select' && (
                  <div className="md:col-span-2">
                    <Label className="text-gray-300">Options (comma-separated)</Label>
                    <Input
                      value={newField.options}
                      onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                      placeholder="Option 1, Option 2, Option 3"
                      className="bg-gray-600 border-gray-500 text-white"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newField.is_required}
                    onCheckedChange={(checked) => setNewField({ ...newField, is_required: checked })}
                  />
                  <Label className="text-gray-300">Required Field</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddField} className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-1" />
                  Save Field
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddForm(false)}
                  className="border-gray-500 text-gray-300"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Fields List */}
        {fields.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No custom fields configured for this tournament.
            <br />
            <span className="text-sm">Add fields to collect additional information during registration.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{field.field_label}</span>
                      {getFieldTypeBadge(field.field_type)}
                      {field.is_required && (
                        <Badge variant="outline" className="border-red-500 text-red-400 text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    <span className="text-gray-400 text-sm">{field.field_name}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteField(field.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TournamentCustomFieldsAdmin;

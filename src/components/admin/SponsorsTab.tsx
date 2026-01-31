import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { sponsorService, Sponsor, SponsorInput } from '@/services/sponsorService';
import { Plus, Edit, Trash2, Globe, Building } from 'lucide-react';

const SponsorsTab = () => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<SponsorInput>({
    defaultValues: {
      name: '',
      description: '',
      website: '',
      logo: '',
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    loadSponsors();
  }, []);

  const loadSponsors = async () => {
    try {
      const data = await sponsorService.getAllSponsors();
      setSponsors(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load sponsors",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (data: SponsorInput) => {
    setLoading(true);
    try {
      if (editingSponsor) {
        await sponsorService.updateSponsor(editingSponsor.id, data);
        toast({
          title: "Success",
          description: "Sponsor updated successfully",
        });
      } else {
        await sponsorService.createSponsor(data);
        toast({
          title: "Success",
          description: "Sponsor created successfully",
        });
      }
      
      setIsDialogOpen(false);
      setEditingSponsor(null);
      form.reset();
      await loadSponsors();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingSponsor ? 'update' : 'create'} sponsor`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    form.reset({
      name: sponsor.name,
      description: sponsor.description || '',
      website: sponsor.website || '',
      logo: sponsor.logo || '',
      display_order: sponsor.display_order,
      is_active: sponsor.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sponsor?')) return;
    
    try {
      await sponsorService.deleteSponsor(id);
      toast({
        title: "Success",
        description: "Sponsor deleted successfully",
      });
      await loadSponsors();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete sponsor",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (sponsor: Sponsor) => {
    try {
      await sponsorService.toggleSponsorStatus(sponsor.id, !sponsor.is_active);
      toast({
        title: "Success",
        description: `Sponsor ${!sponsor.is_active ? 'activated' : 'deactivated'} successfully`,
      });
      await loadSponsors();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update sponsor status",
        variant: "destructive",
      });
    }
  };

  const openCreateDialog = () => {
    setEditingSponsor(null);
    form.reset({
      name: '',
      description: '',
      website: '',
      logo: '',
      display_order: sponsors.length,
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Sponsors Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Sponsor
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>
                {editingSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sponsor Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-gray-700 border-gray-600 text-white" 
                          placeholder="Enter sponsor name"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-gray-700 border-gray-600 text-white" 
                          placeholder="Brief description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-gray-700 border-gray-600 text-white" 
                          placeholder="https://sponsor-website.com"
                          type="url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-gray-700 border-gray-600 text-white" 
                          placeholder="https://logo-url.com/logo.png"
                          type="url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="display_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          className="bg-gray-700 border-gray-600 text-white" 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3">
                      <FormLabel>Active</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {loading ? 'Saving...' : (editingSponsor ? 'Update' : 'Create')}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {sponsors.map((sponsor) => (
          <Card key={sponsor.id} className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                    {sponsor.logo ? (
                      <img 
                        src={sponsor.logo} 
                        alt={sponsor.name} 
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <Building className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{sponsor.name}</h3>
                    <p className="text-gray-400 text-sm">{sponsor.description}</p>
                    {sponsor.website && (
                      <div className="flex items-center space-x-1 mt-1">
                        <Globe className="w-3 h-3 text-gray-500" />
                        <a 
                          href={sponsor.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-purple-400 text-xs hover:underline"
                        >
                          {sponsor.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Order: {sponsor.display_order}</span>
                  <div className="flex items-center space-x-1">
                    <Switch
                      checked={sponsor.is_active}
                      onCheckedChange={() => handleToggleStatus(sponsor)}
                    />
                    <span className="text-xs text-gray-400">
                      {sponsor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(sponsor)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(sponsor.id)}
                    className="border-red-600 text-red-400 hover:bg-red-600/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {sponsors.length === 0 && (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-12 text-center">
              <Building className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">No sponsors found</h3>
              <p className="text-gray-400 text-sm">Add your first sponsor to get started</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SponsorsTab;
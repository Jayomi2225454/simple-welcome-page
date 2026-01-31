import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SportsRegistrationFormProps {
  tournamentId: string;
  tournamentName: string;
  entryFee: string;
  onRegistrationComplete?: () => void;
}

const SportsRegistrationForm = ({ 
  tournamentId, 
  tournamentName, 
  entryFee,
  onRegistrationComplete 
}: SportsRegistrationFormProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    teamName: "",
    captainName: "",
    captainPhone: "",
    city: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please login to register");
      return;
    }

    if (!formData.teamName || !formData.captainName || !formData.captainPhone || !formData.city) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    
    // Mock registration since tables don't exist yet
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success("Registration successful! (Demo mode - database tables pending)");
    setOpen(false);
    setFormData({ teamName: "", captainName: "", captainPhone: "", city: "" });
    onRegistrationComplete?.();
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
          Register Now
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Register for {tournamentName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teamName" className="text-gray-300">Team Name *</Label>
            <Input
              id="teamName"
              value={formData.teamName}
              onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
              placeholder="Enter your team name"
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="captainName" className="text-gray-300">Captain Name *</Label>
            <Input
              id="captainName"
              value={formData.captainName}
              onChange={(e) => setFormData({ ...formData, captainName: e.target.value })}
              placeholder="Team captain's full name"
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="captainPhone" className="text-gray-300">Captain Phone *</Label>
            <Input
              id="captainPhone"
              type="tel"
              value={formData.captainPhone}
              onChange={(e) => setFormData({ ...formData, captainPhone: e.target.value })}
              placeholder="+91 XXXXX XXXXX"
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city" className="text-gray-300">City *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Your city"
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>
          <div className="pt-2">
            <p className="text-sm text-gray-400 mb-4">
              Entry Fee: <span className="font-semibold text-emerald-400">
                {entryFee === 'Free' || entryFee === '0' ? 'Free' : `₹${entryFee}`}
              </span>
            </p>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600" 
              disabled={loading}
            >
              {loading ? "Processing..." : "Complete Registration"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SportsRegistrationForm;

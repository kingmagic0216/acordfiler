import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  X, 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Building2,
  User,
  Shield
} from "lucide-react";
import { FormSubmission } from "@/services/formService";

interface EditSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: FormSubmission | null;
  onSave: (updatedSubmission: FormSubmission) => void;
}

const EditSubmissionModal = ({ 
  isOpen, 
  onClose, 
  submission, 
  onSave 
}: EditSubmissionModalProps) => {
  const [formData, setFormData] = useState({
    businessName: "",
    federalId: "",
    businessType: "",
    yearsInBusiness: "",
    description: "",
    website: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    status: "",
    priority: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Initialize form data when submission changes
  useEffect(() => {
    if (submission) {
      setFormData({
        businessName: submission.businessInfo.name,
        federalId: submission.businessInfo.federalId,
        businessType: submission.businessInfo.businessType,
        yearsInBusiness: submission.businessInfo.yearsInBusiness.toString(),
        description: submission.businessInfo.description,
        website: submission.businessInfo.website || "",
        contactName: submission.contactInfo.contactName,
        email: submission.contactInfo.email,
        phone: submission.contactInfo.phone,
        address: submission.contactInfo.address,
        city: submission.contactInfo.city,
        state: submission.contactInfo.state,
        zip: submission.contactInfo.zipCode,
        status: submission.status,
        priority: submission.priority
      });
    }
  }, [submission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      if (!submission) {
        throw new Error("No submission to update");
      }

      // Validate required fields
      if (!formData.businessName || !formData.federalId || !formData.businessType ||
          !formData.yearsInBusiness || !formData.description || !formData.contactName ||
          !formData.email || !formData.phone || !formData.address ||
          !formData.city || !formData.state || !formData.zip) {
        throw new Error("Please fill in all required fields");
      }

      // Create updated submission
      const updatedSubmission: FormSubmission = {
        ...submission,
        businessInfo: {
          ...submission.businessInfo,
          name: formData.businessName,
          federalId: formData.federalId,
          businessType: formData.businessType,
          yearsInBusiness: parseInt(formData.yearsInBusiness),
          description: formData.description,
          website: formData.website || undefined,
        },
        contactInfo: {
          ...submission.contactInfo,
          contactName: formData.contactName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zip,
        },
        status: formData.status as 'new' | 'review' | 'signature' | 'completed',
        priority: formData.priority as 'low' | 'medium' | 'high',
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSave(updatedSubmission);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !submission) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl font-bold">Edit Submission</CardTitle>
          <CardDescription>
            Update submission details for {submission.id}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Business Information */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Business Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="federalId">Federal ID/EIN *</Label>
                  <Input
                    id="federalId"
                    value={formData.federalId}
                    onChange={(e) => setFormData(prev => ({ ...prev, federalId: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type *</Label>
                  <Select value={formData.businessType} onValueChange={(value) => setFormData(prev => ({ ...prev, businessType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Corporation">Corporation</SelectItem>
                      <SelectItem value="LLC">LLC</SelectItem>
                      <SelectItem value="Partnership">Partnership</SelectItem>
                      <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                      <SelectItem value="Non-Profit">Non-Profit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearsInBusiness">Years in Business *</Label>
                  <Input
                    id="yearsInBusiness"
                    type="number"
                    value={formData.yearsInBusiness}
                    onChange={(e) => setFormData(prev => ({ ...prev, yearsInBusiness: e.target.value }))}
                    required
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="description">Business Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    required
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <User className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold">Contact Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name *</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code *</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Status and Priority */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold">Status & Priority</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="signature">Awaiting Signature</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditSubmissionModal;


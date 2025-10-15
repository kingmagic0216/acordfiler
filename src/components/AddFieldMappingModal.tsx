import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, AlertCircle } from "lucide-react";

interface AddFieldMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mapping: FieldMapping) => void;
}

interface FieldMapping {
  id: string;
  acordForm: string;
  fieldName: string;
  intakeField: string;
  fieldType: string;
  required: boolean;
}

const AddFieldMappingModal = ({ isOpen, onClose, onSave }: AddFieldMappingModalProps) => {
  const [formData, setFormData] = useState({
    acordForm: "",
    fieldName: "",
    intakeField: "",
    fieldType: "text",
    required: "required"
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Basic validation
      if (!formData.acordForm || !formData.fieldName || !formData.intakeField) {
        throw new Error("Please fill in all required fields.");
      }

      const newMapping: FieldMapping = {
        id: `mapping-${Date.now()}`,
        acordForm: formData.acordForm,
        fieldName: formData.fieldName,
        intakeField: formData.intakeField,
        fieldType: formData.fieldType,
        required: formData.required === "required"
      };

      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      onSave(newMapping);
      onClose();
      
      // Reset form
      setFormData({
        acordForm: "",
        fieldName: "",
        intakeField: "",
        fieldType: "text",
        required: "required"
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred during save.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col">
            <CardTitle className="text-xl">Add Field Mapping</CardTitle>
            <CardDescription>Create a new mapping between intake fields and ACORD form fields</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center space-x-2 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="acordForm">ACORD Form *</Label>
              <Select value={formData.acordForm} onValueChange={(value) => handleSelectChange("acordForm", value)}>
                <SelectTrigger id="acordForm">
                  <SelectValue placeholder="Select ACORD form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACORD 125">ACORD 125</SelectItem>
                  <SelectItem value="ACORD 126">ACORD 126</SelectItem>
                  <SelectItem value="ACORD 127">ACORD 127</SelectItem>
                  <SelectItem value="ACORD 130">ACORD 130</SelectItem>
                  <SelectItem value="ACORD 140">ACORD 140</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fieldName">Field Name *</Label>
              <Input 
                id="fieldName" 
                value={formData.fieldName} 
                onChange={handleChange} 
                placeholder="e.g., Business Name"
                required 
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="intakeField">Intake Field *</Label>
              <Input 
                id="intakeField" 
                value={formData.intakeField} 
                onChange={handleChange} 
                placeholder="e.g., businessInfo.name"
                required 
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fieldType">Field Type</Label>
              <Select value={formData.fieldType} onValueChange={(value) => handleSelectChange("fieldType", value)}>
                <SelectTrigger id="fieldType">
                  <SelectValue placeholder="Select field type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="required">Required</Label>
              <Select value={formData.required} onValueChange={(value) => handleSelectChange("required", value)}>
                <SelectTrigger id="required">
                  <SelectValue placeholder="Select requirement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="required">Required</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Mapping
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddFieldMappingModal;


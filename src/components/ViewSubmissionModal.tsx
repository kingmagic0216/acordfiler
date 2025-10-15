import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  X, 
  Calendar, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  User, 
  Shield, 
  FileText,
  Download,
  Send,
  Edit
} from "lucide-react";
import { FormSubmission } from "@/services/formService";
import { pdfService } from "@/services/pdfService";

interface ViewSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: FormSubmission | null;
  onEdit?: (submission: FormSubmission) => void;
  onGenerateCOI?: (submissionId: string) => void;
}

const ViewSubmissionModal = ({ 
  isOpen, 
  onClose, 
  submission, 
  onEdit, 
  onGenerateCOI 
}: ViewSubmissionModalProps) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingCOI, setIsGeneratingCOI] = useState(false);

  if (!isOpen || !submission) return null;

  const handleGenerateACORD = async (formType: string) => {
    setIsGeneratingPDF(true);
    try {
      const pdfBlob = await pdfService.generateACORDPDF(submission, formType);
      const filename = `${formType.replace(' ', '_')}_${submission.id}.pdf`;
      await pdfService.downloadPDF(pdfBlob, filename);
    } catch (error) {
      console.error('Failed to generate ACORD PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateCOI = async () => {
    setIsGeneratingCOI(true);
    try {
      const pdfBlob = await pdfService.generateCOI(submission);
      const filename = `COI_${submission.id}.pdf`;
      await pdfService.downloadPDF(pdfBlob, filename);
      if (onGenerateCOI) {
        onGenerateCOI(submission.id);
      }
    } catch (error) {
      console.error('Failed to generate COI:', error);
      alert('Failed to generate COI. Please try again.');
    } finally {
      setIsGeneratingCOI(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-100 text-blue-800">New</Badge>;
      case "review":
        return <Badge className="bg-yellow-100 text-yellow-800">In Review</Badge>;
      case "signature":
        return <Badge className="bg-purple-100 text-purple-800">Awaiting Signature</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "low":
        return <Badge variant="outline" className="text-gray-600">Low</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case "high":
        return <Badge className="bg-red-100 text-red-800">High</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Submission Details</CardTitle>
              <CardDescription>
                Submission ID: {submission.id} • Submitted: {submission.submittedAt.toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(submission.status)}
              {getPriorityBadge(submission.priority)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business Information */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Building2 className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Business Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Business Name</label>
                <p className="text-sm">{submission.businessInfo.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Federal ID/EIN</label>
                <p className="text-sm">{submission.businessInfo.federalId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Business Type</label>
                <p className="text-sm">{submission.businessInfo.businessType}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Years in Business</label>
                <p className="text-sm">{submission.businessInfo.yearsInBusiness}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600">Business Description</label>
                <p className="text-sm">{submission.businessInfo.description}</p>
              </div>
              {submission.businessInfo.website && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">Website</label>
                  <p className="text-sm">
                    <a href={submission.businessInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {submission.businessInfo.website}
                    </a>
                  </p>
                </div>
              )}
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
              <div>
                <label className="text-sm font-medium text-gray-600">Contact Name</label>
                <p className="text-sm">{submission.contactInfo.contactName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-sm">
                  <a href={`mailto:${submission.contactInfo.email}`} className="text-blue-600 hover:underline">
                    {submission.contactInfo.email}
                  </a>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Phone</label>
                <p className="text-sm">
                  <a href={`tel:${submission.contactInfo.phone}`} className="text-blue-600 hover:underline">
                    {submission.contactInfo.phone}
                  </a>
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600">Address</label>
                <p className="text-sm">
                  {submission.contactInfo.address}<br />
                  {submission.contactInfo.city}, {submission.contactInfo.state} {submission.contactInfo.zipCode}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Coverage Information */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Coverage Needs</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {submission.coverageInfo.coverageTypes.map((coverage, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  {coverage}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                onClick={() => handleGenerateACORD("ACORD 125")}
                disabled={isGeneratingPDF}
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate ACORD 125
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleGenerateACORD("ACORD 126")}
                disabled={isGeneratingPDF}
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate ACORD 126
              </Button>
              <Button 
                variant="outline" 
                onClick={handleGenerateCOI}
                disabled={isGeneratingCOI}
              >
                <Send className="mr-2 h-4 w-4" />
                Generate COI
              </Button>
              {onEdit && (
                <Button 
                  variant="default" 
                  onClick={() => onEdit(submission)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Submission
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ViewSubmissionModal;


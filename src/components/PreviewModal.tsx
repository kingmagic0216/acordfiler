import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Eye, X } from "lucide-react";
import { FormSubmission } from "@/services/formService";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: {
    submission: FormSubmission;
    formType: string;
    pdfBlob: Blob;
  } | null;
  onDownload: () => void;
}

const PreviewModal = ({ isOpen, onClose, previewData, onDownload }: PreviewModalProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Create preview URL when modal opens
  useEffect(() => {
    if (isOpen && previewData) {
      const url = URL.createObjectURL(previewData.pdfBlob);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [isOpen, previewData]);

  if (!isOpen || !previewData) return null;

  const { submission, formType } = previewData;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Preview {formType}</h2>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Submission Info */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Submission ID:</span>
                  <p className="text-sm text-gray-600">{submission.id}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Client:</span>
                  <p className="text-sm text-gray-600">{submission.businessInfo.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Contact:</span>
                  <p className="text-sm text-gray-600">{submission.contactInfo.contactName}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Email:</span>
                  <p className="text-sm text-gray-600">{submission.contactInfo.email}</p>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-sm font-medium">Coverage Types:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {submission.coverageInfo.coverageTypes.map((type, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PDF Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Form Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[400px] border-0"
                  title={`${formType} Preview`}
                />
              ) : (
                <div className="flex items-center justify-center h-[400px] bg-gray-100">
                  <p className="text-gray-500">Loading preview...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={onDownload} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;

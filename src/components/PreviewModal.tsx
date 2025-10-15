import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  if (!previewData) return null;

  const { submission, formType } = previewData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview {formType}
          </DialogTitle>
          <DialogDescription>
            Review the generated ACORD form before downloading
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 max-h-[60vh] overflow-hidden">
          {/* Submission Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Submission ID:</span>
                  <p className="text-sm text-muted-foreground">{submission.id}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Client:</span>
                  <p className="text-sm text-muted-foreground">{submission.businessInfo.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Contact:</span>
                  <p className="text-sm text-muted-foreground">{submission.contactInfo.contactName}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Email:</span>
                  <p className="text-sm text-muted-foreground">{submission.contactInfo.email}</p>
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
          <Card className="flex-1">
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
                <div className="flex items-center justify-center h-[400px] bg-muted">
                  <p className="text-muted-foreground">Loading preview...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreviewModal;

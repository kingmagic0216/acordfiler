import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X, Save, Loader2, AlertCircle, Settings } from "lucide-react";

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: (settings: any) => void;
}

const SystemSettingsModal = ({ isOpen, onClose, onSettingsSaved }: SystemSettingsModalProps) => {
  const [settings, setSettings] = useState({
    autoSaveForms: true,
    emailNotifications: true,
    auditLogging: true,
    sessionTimeout: 30,
    passwordPolicy: "strong",
    twoFactorAuth: false,
    systemMaintenanceMode: false,
    maxFileUploadSize: 10,
    allowedFileTypes: "pdf,doc,docx,jpg,png"
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = (field: string) => {
    setSettings(prev => ({ ...prev, [field]: !prev[field as keyof typeof prev] }));
  };

  const handleChange = (field: string, value: string | number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Validation
      if (settings.sessionTimeout < 5 || settings.sessionTimeout > 480) {
        throw new Error("Session timeout must be between 5 and 480 minutes.");
      }

      if (settings.maxFileUploadSize < 1 || settings.maxFileUploadSize > 100) {
        throw new Error("Max file upload size must be between 1 and 100 MB.");
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      onSettingsSaved(settings);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-card z-10 border-b">
          <div className="flex flex-col">
            <CardTitle className="text-xl flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              System Settings
            </CardTitle>
            <CardDescription>Configure global platform settings</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {error && (
            <div className="flex items-center space-x-2 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">General Settings</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Auto-save forms</Label>
                <p className="text-sm text-muted-foreground">Automatically save form progress</p>
              </div>
              <Switch 
                checked={settings.autoSaveForms} 
                onCheckedChange={() => handleToggle('autoSaveForms')} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Email notifications</Label>
                <p className="text-sm text-muted-foreground">Send email updates to users</p>
              </div>
              <Switch 
                checked={settings.emailNotifications} 
                onCheckedChange={() => handleToggle('emailNotifications')} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Audit logging</Label>
                <p className="text-sm text-muted-foreground">Track all system activities</p>
              </div>
              <Switch 
                checked={settings.auditLogging} 
                onCheckedChange={() => handleToggle('auditLogging')} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">System maintenance mode</Label>
                <p className="text-sm text-muted-foreground">Temporarily disable user access</p>
              </div>
              <Switch 
                checked={settings.systemMaintenanceMode} 
                onCheckedChange={() => handleToggle('systemMaintenanceMode')} 
              />
            </div>
          </div>

          {/* Security Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Security Settings</h3>
            
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleChange("sessionTimeout", parseInt(e.target.value) || 30)}
                min="5"
                max="480"
                className="w-32"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordPolicy">Password Policy</Label>
              <Select 
                value={settings.passwordPolicy} 
                onValueChange={(value) => handleChange("passwordPolicy", value)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic (8+ characters)</SelectItem>
                  <SelectItem value="strong">Strong (8+ chars, mixed case, numbers)</SelectItem>
                  <SelectItem value="strict">Strict (12+ chars, special characters)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Two-factor authentication</Label>
                <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
              </div>
              <Switch 
                checked={settings.twoFactorAuth} 
                onCheckedChange={() => handleToggle('twoFactorAuth')} 
              />
            </div>
          </div>

          {/* File Upload Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">File Upload Settings</h3>
            
            <div className="space-y-2">
              <Label htmlFor="maxFileUploadSize">Max File Upload Size (MB)</Label>
              <Input
                id="maxFileUploadSize"
                type="number"
                value={settings.maxFileUploadSize}
                onChange={(e) => handleChange("maxFileUploadSize", parseInt(e.target.value) || 10)}
                min="1"
                max="100"
                className="w-32"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allowedFileTypes">Allowed File Types</Label>
              <Input
                id="allowedFileTypes"
                value={settings.allowedFileTypes}
                onChange={(e) => handleChange("allowedFileTypes", e.target.value)}
                placeholder="pdf,doc,docx,jpg,png"
                className="w-64"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of allowed file extensions
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettingsModal;

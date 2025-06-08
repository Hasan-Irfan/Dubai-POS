import React from 'react';
    import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Settings, Sun, Moon } from 'lucide-react';
    import { useTheme } from '@/contexts/ThemeContext';

    const SettingsPage = () => {
      const { theme, toggleTheme } = useTheme();

      return (
        <div>
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-primary via-accent to-secondary text-transparent bg-clip-text">
              Application Settings
            </h1>
            <p className="text-lg text-muted-foreground">Manage your application preferences and configurations.</p>
          </div>

          <div className="grid gap-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-6 w-6 text-primary" />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-md font-medium text-foreground mb-2">Theme Preference</h3>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant={theme === 'light' ? 'default' : 'outline'} 
                        onClick={() => theme !== 'light' && toggleTheme()}
                        className="w-28"
                      >
                        <Sun className="mr-2 h-4 w-4" /> Light
                      </Button>
                      <Button 
                        variant={theme === 'dark' ? 'default' : 'outline'} 
                        onClick={() => theme !== 'dark' && toggleTheme()}
                        className="w-28"
                      >
                        <Moon className="mr-2 h-4 w-4" /> Dark
                      </Button>
                    </div>
                     <p className="text-xs text-muted-foreground mt-2">
                      Current theme: <span className="font-semibold">{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
                    </p>
                  </div>
                  <p className="text-muted-foreground pt-4">
                    Other general application settings:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Store Information (Name, Address, Contact)</li>
                    <li>Currency Settings</li>
                    <li>Timezone Preferences</li>
                    <li>Notification Preferences</li>
                  </ul>
                </div>
                 <div className="mt-6 p-8 bg-muted/30 rounded-md flex items-center justify-center h-48">
                  <p className="text-lg text-muted-foreground">More configuration options will appear here.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-6 w-6 text-primary" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  This section would typically include options for:
                </p>
                <ul className="list-disc list-inside mt-4 space-y-2 text-muted-foreground">
                  <li>Password Policy Management</li>
                  <li>Two-Factor Authentication Setup</li>
                  <li>API Key Management (if applicable)</li>
                  <li>Session Timeout Configuration</li>
                </ul>
                <div className="mt-6 p-8 bg-muted/30 rounded-md flex items-center justify-center h-48">
                  <p className="text-lg text-muted-foreground">Security configurations will be available here.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    };

    export default SettingsPage;
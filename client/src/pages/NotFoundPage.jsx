
    import React from 'react';
    import { Link } from 'react-router-dom';
    import { Button } from '@/components/ui/button';
    import { AlertTriangle } from 'lucide-react';

    const NotFoundPage = () => {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center">
          <AlertTriangle className="w-24 h-24 text-destructive mb-6" />
          <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
          <p className="text-2xl text-muted-foreground mb-8">Oops! The page you're looking for doesn't exist.</p>
          <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
            <Link to="/">Go Back to Dashboard</Link>
          </Button>
        </div>
      );
    };
    export default NotFoundPage;
  
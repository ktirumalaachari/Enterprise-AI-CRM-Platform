import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const Unauthorized = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center py-6 border-red-100 bg-red-50/10">
        <CardBody className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your current role assignment does not have the necessary permissions to access this administrative zone. Please contact your workspace manager for authorization.
          </p>
          <Link to="/dashboard" className="mt-2">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Overview</span>
            </Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
};

export default Unauthorized;

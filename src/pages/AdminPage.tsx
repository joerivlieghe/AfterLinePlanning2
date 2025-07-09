import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import OperatorCompetenciesTab from './admin/OperatorCompetenciesTab';
import OperatorAvailabilityTab from './admin/OperatorAvailabilityTab';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Button variant="outline" onClick={() => navigate('/')} className="mb-6 flex items-center">
        <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>
      <h1 className="text-4xl font-extrabold mb-8 text-gray-900 text-center">Operator Administration</h1>

      <Tabs defaultValue="competencies" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="competencies">Manage Competencies</TabsTrigger>
          <TabsTrigger value="availability">Manage Availability</TabsTrigger>
        </TabsList>
        <TabsContent value="competencies">
          <OperatorCompetenciesTab />
        </TabsContent>
        <TabsContent value="availability">
          <OperatorAvailabilityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;

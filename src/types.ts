import { TruckStatus } from './lib/data';

export type RepairType = 'Mechanical' | 'Electrical' | 'Software' | 'Paint' | 'Customer Adaptation - Mechanical' | 'Customer Adaptation - Paint';
export type OperatorStatus = 'Available' | 'Busy' | 'On Break' | 'Off Duty';
export type Shift = 'Early' | 'Late';
export type CustomerPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type MissingPartStatus = 'Ordered' | 'In Transit' | 'Available' | 'Installed';
export type Market = 'Germany' | 'France' | 'Italy' | 'Spain' | 'United Kingdom' | 'Netherlands' | 'Belgium' | 'Sweden' | 'Poland' | 'Austria';

export interface Deviation {
  id: string;
  type: RepairType;
  description: string;
  timeEstimate: number; // in hours
  completed: boolean;
  completedBy: string | null;
  completedAt: Date | null;
  severity: CustomerPriority; // Added severity
}

export interface MissingPart {
  id: string;
  name: string;
  status: MissingPartStatus;
  orderDate: Date;
  estimatedArrival: Date;
  timeEstimate: number; // in hours for installation
  completed: boolean;
  completedBy: string | null;
  completedAt: Date | null;
}

export interface Truck {
  id: string;
  name: string;
  chassisNumber: string; // Added chassisNumber
  model: string;
  year: number;
  status: TruckStatus;
  deliveryDate: Date;
  invoiceDate: Date; // Added invoiceDate
  customer: string; // Added customer
  market: Market; // Added market
  deviations: Deviation[];
  missingParts: MissingPart[];
  assignedOperatorIds: string[];
  customerPriority: CustomerPriority;
  projectCode?: string;
  deviationTimeEstimate: number; // Total time for deviations
  missingPartsTimeEstimate: number; // Total time for missing parts installation
  repairTimeEstimate: number; // Total repair time (deviations + missing parts + customer adaptation)
  customerAdaptationWork: string | null;
  customerAdaptationTimeEstimate: number | null;
  customerAdaptationCompleted: boolean;
  customerAdaptationCompletedBy: string | null;
  customerAdaptationCompletedAt: Date | null;
  paintDetails?: { // Added paintDetails for paint-related customer adaptation
    color: string;
    paintBoothType: 'Small' | 'Large';
  };
  customerAdaptationType?: 'Paint' | 'Mechanical' | 'Electrical' | 'Software'; // Added type for CA
}

export interface Operator {
  id: string;
  name: string;
  competencies: RepairType[];
  status: OperatorStatus;
  shiftStartTime: Date;
  shiftEndTime: Date;
  shift: Shift;
  assignedTrucks: Truck[]; // Trucks currently assigned to this operator
  efficiency: number; // e.g., 0.8 for 80% efficiency, 1.2 for 120%
}

export interface MarketInvoiceDelta {
  market: Market;
  deltaDays: number; // Changed from minDays/maxDays to a single fixed delta
}

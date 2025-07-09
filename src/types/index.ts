export type TruckStatus = 'Pending' | 'In Progress' | 'Partial' | 'Completed' | 'Overdue' | 'Missing Parts Not Available' | 'Assigned' | 'Ready to Finish' | 'Overdue - Not Ready' | 'Not Ready' | 'Overdue - Ready to Plan' | 'Ready to Plan';
export type RepairType = 'Mechanical' | 'Electrical' | 'Software' | 'Paint' | 'Customer Adaptation';
export type RepairArea = 'Bay 1' | 'Bay 2' | 'Bay 3' | 'Bay 4' | 'Bay 5' | 'Bay 6';
export type MissingPartStatus = 'Ordered' | 'In Transit' | 'Available';
export type OperatorStatus = 'Available' | 'Busy' | 'On Break' | 'Off Duty';
export type Shift = 'Early' | 'Late';

export interface Deviation {
  id: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  completed: boolean;
  completedBy: string | null;
  completedAt: Date | null;
  timeEstimate?: number;
}

export interface MissingPart {
  id: string;
  name: string;
  status: MissingPartStatus;
  promisedDeliveryDate: Date;
  completed: boolean;
  completedBy: string | null;
  completedAt: Date | null;
  timeEstimate?: number;
}

export interface Truck {
  id: string;
  chassisNumber: string;
  deviations: Deviation[];
  missingParts: MissingPart[];
  customerAdaptationWork: string | null;
  customerAdaptationTimeEstimate?: number;
  customerAdaptationCompleted?: boolean;
  customerAdaptationCompletedBy?: string | null;
  customerAdaptationCompletedAt?: Date | null;
  okToDrive: boolean;
  repairTimeEstimate: number; // This will now represent remaining time
  deviationTimeEstimate?: number; // Initial estimate for deviations
  missingPartsTimeEstimate?: number; // Initial estimate for missing parts
  repairType: RepairType;
  repairAreaNeeded: RepairArea;
  deliveryDate: Date;
  customerPriority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedOperatorIds: string[];
  status: TruckStatus;
  projectCode?: string;
}

export interface Operator {
  id: string;
  name: string;
  competencies: RepairType[];
  status: OperatorStatus;
  shiftStartTime: Date;
  shiftEndTime: Date;
  shift: Shift;
  assignedTruckIds: string[]; // Changed to store only IDs
  efficiency: number;
}

export interface ProposedAssignment {
  truck: Truck;
  operator: Operator; // This will be the simulated operator object
  rejected: boolean;
  operatorAvailableHoursBefore: number;
  operatorAvailableHoursAfter: number;
}

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Truck, Operator, RepairType, MissingPartStatus, Deviation } from '@/types';
import { generateTrucks, generateOperators, getPriorityScore, ALL_TRUCK_STATUSES_FOR_GENERATION, getGeneralRepairTypesNeeded } from '@/lib/data'; // Import getGeneralRepairTypesNeeded
import { addDays, isPast } from 'date-fns';

interface AppContextType {
  trucks: Truck[];
  operators: Operator[];
  updateTruck: (updatedTruck: Truck) => void;
  updateOperator: (updatedOperator: Operator) => void;
  addTruck: (newTruck: Truck) => void;
  addOperator: (newOperator: Operator) => void;
  deleteTruck: (truckId: string) => void;
  deleteOperator: (operatorId: string) => void;
  generateNewData: (numTrucks: number, numOperators: number) => void;
  toggleDeviationCompletion: (truckId: string, deviationId: string, completedBy: string | null) => void;
  toggleMissingPartCompletion: (truckId: string, partId: string, completedBy: string | null) => void;
  updateTruckStatus: (truckId: string, newStatus: Truck['status']) => void;
  updateTruckDeliveryDate: (truckId: string, newDate: Date) => void;
  updateTruckCustomerPriority: (truckId: string, newPriority: Truck['customerPriority']) => void;
  updateTruckProjectCode: (truckId: string, newProjectCode: string | undefined) => void;
  allProjectCodes: string[];
  assignOperatorToTruck: (truckId: string, operatorId: string) => void;
  unassignOperatorFromTruck: (truckId: string, operatorId: string) => void;
  markDeviationComplete: (truckId: string, deviationId: string, completedBy: string) => boolean;
  markMissingPartComplete: (truckId: string, partId: string, completedBy: string) => void;
  markCustomerAdaptationComplete: (truckId: string, completedBy: string) => void;
  markTruckComplete: (truckId: string) => void;
  prioritizedTrucks: Truck[]; // Added prioritizedTrucks to the interface
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  useEffect(() => {
    // Generate initial data on component mount
    generateNewData(200, 24); // Changed to 200 trucks, 24 operators
  }, []);

  const calculateTruckTimeEstimates = useCallback((truck: Truck) => {
    const deviationTimeEstimate = truck.deviations.reduce((sum, dev) => sum + (dev.completed ? 0 : (dev.timeEstimate || 0)), 0);
    const missingPartsTimeEstimate = truck.missingParts.reduce((sum, part) => sum + (part.completed ? 0 : (part.timeEstimate || 0)), 0);
    
    let repairTimeEstimate = 0;
    if (truck.customerAdaptationWork && !truck.customerAdaptationCompleted) {
      repairTimeEstimate = (truck.customerAdaptationTimeEstimate || 0);
    } else {
      repairTimeEstimate = deviationTimeEstimate + missingPartsTimeEstimate;
    }

    return { deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate };
  }, []);

  const updateTruck = useCallback((updatedTruck: Truck) => {
    setTrucks((prevTrucks) => {
      const newTrucks = prevTrucks.map((truck) =>
        truck.id === updatedTruck.id ? updatedTruck : truck
      );
      return newTrucks;
    });
  }, []);

  const updateOperator = useCallback((updatedOperator: Operator) => {
    setOperators((prevOperators) =>
      prevOperators.map((operator) =>
        operator.id === updatedOperator.id ? updatedOperator : operator
      )
    );
  }, []);

  const addTruck = useCallback((newTruck: Truck) => {
    setTrucks((prevTrucks) => [...prevTrucks, newTruck]);
  }, []);

  const addOperator = useCallback((newOperator: Operator) => {
    setOperators((prevOperators) => [...prevOperators, newOperator]);
  }, []);

  const deleteTruck = useCallback((truckId: string) => {
    setTrucks((prevTrucks) => prevTrucks.filter((truck) => truck.id !== truckId));
  }, []);

  const deleteOperator = useCallback((operatorId: string) => {
    setOperators((prevOperators) => prevOperators.filter((operator) => operator.id !== operatorId));
  }, []);

  const generateNewData = useCallback((numTrucks: number, numOperators: number) => {
    const generatedTrucks = generateTrucks(numTrucks);
    const generatedOperators = generateOperators(numOperators);

    // Recalculate initial time estimates for generated trucks
    const trucksWithEstimates = generatedTrucks.map(truck => {
      const { deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate } = calculateTruckTimeEstimates(truck);
      return {
        ...truck,
        deviationTimeEstimate,
        missingPartsTimeEstimate,
        repairTimeEstimate,
      };
    });

    setTrucks(trucksWithEstimates);
    setOperators(generatedOperators);
  }, [calculateTruckTimeEstimates]);

  const toggleDeviationCompletion = useCallback((truckId: string, deviationId: string, completedBy: string | null) => {
    setTrucks((prevTrucks) =>
      prevTrucks.map((truck) => {
        if (truck.id === truckId) {
          const updatedDeviations = truck.deviations.map((dev) =>
            dev.id === deviationId
              ? { ...dev, completed: !dev.completed, completedBy: !dev.completed ? completedBy : null, completedAt: !dev.completed ? new Date() : null }
              : dev
          );
          const updatedTruck = { ...truck, deviations: updatedDeviations };
          const { deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate } = calculateTruckTimeEstimates(updatedTruck);
          return { ...updatedTruck, deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate };
        }
        return truck;
      })
    );
  }, [calculateTruckTimeEstimates]);

  const toggleMissingPartCompletion = useCallback((truckId: string, partId: string, completedBy: string | null) => {
    setTrucks((prevTrucks) =>
      prevTrucks.map((truck) => {
        if (truck.id === truckId) {
          const updatedMissingParts = truck.missingParts.map((part) =>
            part.id === partId
              ? { ...part, completed: !part.completed, completedBy: !part.completed ? completedBy : null, completedAt: !part.completed ? new Date() : null }
              : part
          );
          const updatedTruck = { ...truck, missingParts: updatedMissingParts };
          const { deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate } = calculateTruckTimeEstimates(updatedTruck);
          return { ...updatedTruck, deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate };
        }
        return truck;
      })
    );
  }, [calculateTruckTimeEstimates]);

  const updateTruckStatus = useCallback((truckId: string, newStatus: Truck['status']) => {
    setTrucks((prevTrucks) =>
      prevTrucks.map((truck) =>
        truck.id === truckId ? { ...truck, status: newStatus } : truck
      )
    );
  }, []);

  const updateTruckDeliveryDate = useCallback((truckId: string, newDate: Date) => {
    setTrucks((prevTrucks) =>
      prevTrucks.map((truck) =>
        truck.id === truckId ? { ...truck, deliveryDate: newDate } : truck
      )
    );
  }, []);

  const updateTruckCustomerPriority = useCallback((truckId: string, newPriority: Truck['customerPriority']) => {
    setTrucks((prevTrucks) =>
      prevTrucks.map((truck) =>
        truck.id === truckId ? { ...truck, customerPriority: newPriority } : truck
      )
    );
  }, []);

  const updateTruckProjectCode = useCallback((truckId: string, newProjectCode: string | undefined) => {
    setTrucks((prevTrucks) =>
      prevTrucks.map((truck) =>
        truck.id === truckId ? { ...truck, projectCode: newProjectCode } : truck
      )
    );
  }, []);

  // Derive all unique project codes from the trucks data
  const allProjectCodes = useMemo(() => {
    if (!Array.isArray(trucks)) {
      return [];
    }
    const codes = new Set<string>();
    trucks.forEach(truck => {
      if (truck.projectCode) {
        codes.add(truck.projectCode);
      }
    });
    return Array.from(codes).sort();
  }, [trucks]);

  const assignOperatorToTruck = useCallback((truckId: string, operatorId: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId && !truck.assignedOperatorIds.includes(operatorId)) {
        return { ...truck, assignedOperatorIds: [...truck.assignedOperatorIds, operatorId], status: 'Assigned' }; // Set status to Assigned
      }
      return truck;
    }));
    setOperators(prevOperators => prevOperators.map(operator => {
      if (operator.id === operatorId) {
        const truck = trucks.find(t => t.id === truckId);
        if (truck && !operator.assignedTrucks.some(t => t.id === truckId)) {
          return { ...operator, assignedTrucks: [...operator.assignedTrucks, truck], status: 'Busy' }; // Set operator status to Busy
        }
      }
      return operator;
    }));
  }, [trucks]);

  const unassignOperatorFromTruck = useCallback((truckId: string, operatorId: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId) {
        const updatedAssignedOperatorIds = truck.assignedOperatorIds.filter(id => id !== operatorId);
        // If no operators are assigned, revert status to 'Ready to Plan' or 'Overdue - Ready to Plan'
        let newStatus = truck.status;
        if (updatedAssignedOperatorIds.length === 0 && (truck.status === 'Assigned' || truck.status === 'Partial' || truck.status === 'Ready to Finish')) {
          const hasPendingMissingParts = truck.missingParts.some(mp => mp.status !== 'Available' && !mp.completed);
          const isOverdue = isPast(truck.deliveryDate, new Date());
          if (hasPendingMissingParts) {
            newStatus = isOverdue ? 'Overdue - Not Ready' : 'Not Ready';
          } else {
            newStatus = isOverdue ? 'Overdue - Ready to Plan' : 'Ready to Plan';
          }
        }
        return { ...truck, assignedOperatorIds: updatedAssignedOperatorIds, status: newStatus };
      }
      return truck;
    }));
    setOperators(prevOperators => prevOperators.map(operator => ({
      ...operator,
      assignedTrucks: operator.assignedTrucks.filter(t => t.id !== truckId),
      status: operator.assignedTrucks.filter(t => t.id !== truckId).length === 0 ? 'Available' : 'Busy', // Update operator status
    })));
  }, []);

  const markDeviationComplete = useCallback((truckId: string, deviationId: string, completedBy: string) => {
    let success = false;
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId) {
        const updatedDeviations = truck.deviations.map(dev => {
          if (dev.id === deviationId) {
            success = true;
            return { ...dev, completed: true, completedBy, completedAt: new Date() };
          }
          return dev;
        });
        const updatedTruck = { ...truck, deviations: updatedDeviations };
        const { deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate } = calculateTruckTimeEstimates(updatedTruck);
        
        // Update truck status based on completion progress
        let newStatus = updatedTruck.status;
        const allDeviationsCompleted = updatedDeviations.every(dev => dev.completed);
        const allMissingPartsCompleted = updatedTruck.missingParts.every(mp => mp.completed);
        const customerAdaptationCompleted = updatedTruck.customerAdaptationWork === null || updatedTruck.customerAdaptationCompleted;

        if (allDeviationsCompleted && allMissingPartsCompleted && customerAdaptationCompleted) {
          newStatus = 'Ready to Finish';
        } else if (updatedTruck.assignedOperatorIds.length > 0) {
          newStatus = 'Partial'; // Still assigned, but not fully done
        }
        
        return { ...updatedTruck, deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate, status: newStatus };
      }
      return truck;
    }));
    return success;
  }, [calculateTruckTimeEstimates]);

  const markMissingPartComplete = useCallback((truckId: string, partId: string, completedBy: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId) {
        const updatedMissingParts = truck.missingParts.map(part => {
          if (part.id === partId) {
            return { ...part, completed: true, completedBy, completedAt: new Date() };
          }
          return part;
        });
        const updatedTruck = { ...truck, missingParts: updatedMissingParts };
        const { deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate } = calculateTruckTimeEstimates(updatedTruck);

        // Update truck status based on completion progress
        let newStatus = updatedTruck.status;
        const allDeviationsCompleted = updatedTruck.deviations.every(dev => dev.completed);
        const allMissingPartsCompleted = updatedMissingParts.every(mp => mp.completed);
        const customerAdaptationCompleted = updatedTruck.customerAdaptationWork === null || updatedTruck.customerAdaptationCompleted;

        if (allDeviationsCompleted && allMissingPartsCompleted && customerAdaptationCompleted) {
          newStatus = 'Ready to Finish';
        } else if (updatedTruck.assignedOperatorIds.length > 0) {
          newStatus = 'Partial'; // Still assigned, but not fully done
        } else if (allMissingPartsCompleted && updatedTruck.status.includes('Not Ready')) {
          // If missing parts are now available and truck was 'Not Ready', move to 'Ready to Plan'
          newStatus = isPast(updatedTruck.deliveryDate, new Date()) ? 'Overdue - Ready to Plan' : 'Ready to Plan';
        }
        
        return { ...updatedTruck, deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate, status: newStatus };
      }
      return truck;
    }));
  }, [calculateTruckTimeEstimates]);

  const markCustomerAdaptationComplete = useCallback((truckId: string, completedBy: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId) {
        const updatedTruck = {
          ...truck,
          customerAdaptationCompleted: true,
          customerAdaptationCompletedBy: completedBy,
          customerAdaptationCompletedAt: new Date(),
        };
        const { deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate } = calculateTruckTimeEstimates(updatedTruck);

        // Update truck status based on completion progress
        let newStatus = updatedTruck.status;
        const allDeviationsCompleted = updatedTruck.deviations.every(dev => dev.completed);
        const allMissingPartsCompleted = updatedTruck.missingParts.every(mp => mp.completed);
        const customerAdaptationCompleted = updatedTruck.customerAdaptationWork === null || updatedTruck.customerAdaptationCompleted;

        if (allDeviationsCompleted && allMissingPartsCompleted && customerAdaptationCompleted) {
          newStatus = 'Ready to Finish';
        } else if (updatedTruck.assignedOperatorIds.length > 0) {
          newStatus = 'Partial'; // Still assigned, but not fully done
        }
        
        return { ...updatedTruck, deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate, status: newStatus };
      }
      return truck;
    }));
  }, [calculateTruckTimeEstimates]);

  const markTruckComplete = useCallback((truckId: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId) {
        return {
          ...truck,
          status: 'Completed',
          assignedOperatorIds: [], // Unassign all operators
        };
      }
      return truck;
    }));
    setOperators(prevOperators => prevOperators.map(operator => ({
      ...operator,
      assignedTrucks: operator.assignedTrucks.filter(t => t.id !== truckId),
      status: operator.assignedTrucks.filter(t => t.id !== truckId).length === 0 ? 'Available' : 'Busy', // Update operator status
    })));
  }, []);

  // Calculate prioritized trucks
  const prioritizedTrucks = useMemo(() => {
    if (!Array.isArray(trucks)) {
      return [];
    }
    // Filter out completed trucks and trucks with pending missing parts for prioritization
    const eligibleTrucks = trucks.filter(truck => 
      truck.status !== 'Completed' && 
      truck.status !== 'Missing Parts Not Available' &&
      truck.status !== 'Not Ready' // Exclude 'Not Ready' from prioritization for planning
    );

    return [...eligibleTrucks].sort((a, b) => {
      const scoreA = getPriorityScore(a).totalScore;
      const scoreB = getPriorityScore(b).totalScore;
      return scoreB - scoreA; // Higher score means higher priority
    });
  }, [trucks]);

  const contextValue = {
    trucks,
    operators,
    updateTruck,
    updateOperator,
    addTruck,
    addOperator,
    deleteTruck,
    deleteOperator,
    generateNewData,
    toggleDeviationCompletion,
    toggleMissingPartCompletion,
    updateTruckStatus,
    updateTruckDeliveryDate,
    updateTruckCustomerPriority,
    updateTruckProjectCode,
    allProjectCodes,
    assignOperatorToTruck,
    unassignOperatorFromTruck,
    markDeviationComplete,
    markMissingPartComplete,
    markCustomerAdaptationComplete,
    markTruckComplete,
    prioritizedTrucks, // Exposed
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

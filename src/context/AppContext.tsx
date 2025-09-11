import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Truck, Operator, RepairType, MissingPartStatus, Deviation, MarketInvoiceDelta, Market } from '@/types';
import { generateTrucks, generateOperators, getPriorityScore, ALL_TRUCK_STATUSES_FOR_GENERATION, getGeneralRepairTypesNeeded, generateMarketInvoiceDeltas } from '@/lib/data';
import { addDays, isPast, min } from 'date-fns';

interface AppContextType {
  trucks: Truck[];
  operators: Operator[];
  marketInvoiceDeltas: MarketInvoiceDelta[];
  updateTruck: (updatedTruck: Truck) => void;
  updateOperator: (operatorId: string, updatedFields: Partial<Operator>) => void;
  updateMarketInvoiceDelta: (market: Market, deltaDays: number) => void; // Changed to deltaDays
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
  prioritizedTrucks: Truck[];
  useDeliveryDateForCalculations: boolean;
  setUseDeliveryDateForCalculations: (value: boolean) => void;
  getCalculatedDueDate: (truck: Truck) => Date;
  markTruckReadyForDeliveryWithOpenIssues: (truckId: string, notes: string) => void; // New
  overdueTrucksForReport: Truck[]; // New
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [marketInvoiceDeltas, setMarketInvoiceDeltas] = useState<MarketInvoiceDelta[]>([]);
  const [useDeliveryDateForCalculations, setUseDeliveryDateForCalculations] = useState<boolean>(true);

  useEffect(() => {
    try {
      console.log('AppProvider: Initial data generation started.');
      generateNewData(200, 24);
      setMarketInvoiceDeltas(generateMarketInvoiceDeltas());
      console.log('AppProvider: Initial data generation completed.');
    } catch (error) {
      console.error('AppProvider: Error during initial data generation:', error);
    }
  }, []);

  const getCalculatedDueDate = useCallback((truck: Truck): Date => {
    if (useDeliveryDateForCalculations) {
      return truck.deliveryDate;
    } else {
      return min([truck.deliveryDate, truck.invoiceDate]);
    }
  }, [useDeliveryDateForCalculations]);

  // New helper function to determine truck status based on its current state
  const determineTruckStatus = useCallback((truck: Truck): Truck['status'] => {
    // If explicitly marked for delivery with open issues, this takes precedence
    if (truck.readyForDeliveryWithOpenIssues) {
      return 'Ready for Delivery with Open Issues';
    }

    const isOverdue = isPast(getCalculatedDueDate(truck), new Date());

    const allDeviationsCompleted = truck.deviations.every(dev => dev.completed);
    const allMissingPartsCompleted = truck.missingParts.every(mp => mp.completed);
    const customerAdaptationCompleted = truck.customerAdaptationWork === null || truck.customerAdaptationCompleted;

    const hasAnyCompletedWork = truck.deviations.some(dev => dev.completed) ||
                                truck.missingParts.some(mp => mp.completed) ||
                                (truck.customerAdaptationWork !== null && truck.customerAdaptationCompleted);

    const hasAnyOpenWork = truck.deviations.some(dev => !dev.completed) ||
                           truck.missingParts.some(mp => mp.status !== 'Installed' && !mp.completed) || // Check for not installed and not completed
                           (truck.customerAdaptationWork !== null && !truck.customerAdaptationCompleted);

    const hasPendingMissingPartsNotAvailable = truck.missingParts.some(mp => mp.status !== 'Available' && !mp.completed);
    const hasAssignedOperators = truck.assignedOperatorIds.length > 0;

    // Priority 1: Missing Parts Not Available (highest blocking status)
    if (hasPendingMissingPartsNotAvailable) {
      return isOverdue ? 'Overdue - Not Ready' : 'Not Ready';
    }

    // Priority 2: Truck explicitly marked as Completed (preserve this status)
    if (truck.status === 'Completed') {
      return 'Completed';
    }

    // Priority 3: All work done, ready to be marked 'Completed'
    if (allDeviationsCompleted && allMissingPartsCompleted && customerAdaptationCompleted) {
      return 'Ready to Finish';
    }

    // Priority 4: Partial work done and open work, with assigned operators
    if (hasAssignedOperators && hasAnyCompletedWork && hasAnyOpenWork) {
      return 'Partial';
    }

    // Priority 5: Assigned but no work completed yet, and work is open
    if (hasAssignedOperators && !hasAnyCompletedWork && hasAnyOpenWork) {
      return 'Assigned';
    }

    // Priority 6: No operators assigned, but work is open
    if (!hasAssignedOperators && hasAnyOpenWork) {
      return isOverdue ? 'Overdue - Ready to Plan' : 'Ready to Plan';
    }

    // Fallback: If no open work, no assigned operators, and not 'Ready to Finish' or 'Completed'
    // This implies all work is done, but it hasn't been explicitly marked 'Ready to Finish' yet.
    if (!hasAnyOpenWork && !hasAssignedOperators) {
        return 'Ready to Finish';
    }

    return isOverdue ? 'Overdue - Ready to Plan' : 'Ready to Plan'; // Default if nothing else fits
  }, [getCalculatedDueDate]);


  const calculateTruckTimeEstimates = useCallback((truck: Truck) => {
    const deviationTimeEstimate = truck.deviations.reduce((sum, dev) => sum + (dev.completed ? 0 : (dev.timeEstimate || 0)), 0);
    const missingPartsTimeEstimate = truck.missingParts.reduce((sum, part) => sum + (part.completed ? 0 : (part.timeEstimate || 0)), 0);
    
    let repairTimeEstimate = 0;
    if (truck.customerAdaptationWork && !truck.customerAdaptationCompleted) {
      repairTimeEstimate = (truck.customerAdaptationTimeEstimate || 0);
    }
    repairTimeEstimate += deviationTimeEstimate + missingPartsTimeEstimate;

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

  const updateOperator = useCallback((operatorId: string, updatedFields: Partial<Operator>) => {
    setOperators((prevOperators) =>
      prevOperators.map((operator) =>
        operator.id === operatorId ? { ...operator, ...updatedFields } : operator
      )
    );
  }, []);

  const updateMarketInvoiceDelta = useCallback((market: Market, deltaDays: number) => { // Changed to deltaDays
    setMarketInvoiceDeltas(prevDeltas =>
      prevDeltas.map(delta =>
        delta.market === market ? { ...delta, deltaDays } : delta
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

    const trucksWithEstimatesAndInitialStatus = generatedTrucks.map(truck => {
      const { deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate } = calculateTruckTimeEstimates(truck);
      const updatedTruck = {
        ...truck,
        deviationTimeEstimate,
        missingPartsTimeEstimate,
        repairTimeEstimate,
      };
      // Determine initial status using the new function
      const status = determineTruckStatus(updatedTruck);
      return { ...updatedTruck, status };
    });

    const finalOperators = generatedOperators.map(operator => {
      const assignedTrucksForOperator = trucksWithEstimatesAndInitialStatus.filter(truck =>
        truck.assignedOperatorIds.includes(operator.id)
      );
      return {
        ...operator,
        assignedTrucks: assignedTrucksForOperator,
        status: assignedTrucksForOperator.length > 0 ? 'Busy' : 'Available',
      };
    });

    setTrucks(trucksWithEstimatesAndInitialStatus);
    setOperators(finalOperators);
  }, [calculateTruckTimeEstimates, determineTruckStatus]);

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
          
          // Use the new status determination function
          const newStatus = determineTruckStatus({ ...updatedTruck, deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate });
          
          return { ...updatedTruck, deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate, status: newStatus };
        }
        return truck;
      })
    );
  }, [calculateTruckTimeEstimates, determineTruckStatus]);

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

          // Use the new status determination function
          const newStatus = determineTruckStatus({ ...updatedTruck, deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate });
          
          return { ...updatedTruck, deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate, status: newStatus };
        }
        return truck;
      })
    );
  }, [calculateTruckTimeEstimates, determineTruckStatus]);

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
    setTrucks(prevTrucks => {
      const truckToUpdate = prevTrucks.find(t => t.id === truckId);
      if (!truckToUpdate || truckToUpdate.assignedOperatorIds.includes(operatorId)) {
        return prevTrucks;
      }

      const updatedAssignedOperatorIds = [...truckToUpdate.assignedOperatorIds, operatorId];
      const updatedTruck = { ...truckToUpdate, assignedOperatorIds: updatedAssignedOperatorIds };
      
      // Use the new status determination function
      const newStatus = determineTruckStatus(updatedTruck);

      setOperators(prevOperators => {
        return prevOperators.map(operator => {
          if (operator.id === operatorId) {
            if (!operator.assignedTrucks.some(t => t.id === truckId)) {
              return { ...operator, assignedTrucks: [...operator.assignedTrucks, updatedTruck], status: 'Busy' };
            }
          }
          return operator;
        });
      });

      return prevTrucks.map(truck => truck.id === truckId ? { ...updatedTruck, status: newStatus } : truck);
    });
  }, [determineTruckStatus]);

  const unassignOperatorFromTruck = useCallback((truckId: string, operatorId: string) => {
    setTrucks(prevTrucks => {
      const truckToUpdate = prevTrucks.find(t => t.id === truckId);
      if (!truckToUpdate || !truckToUpdate.assignedOperatorIds.includes(operatorId)) {
        return prevTrucks;
      }

      const updatedAssignedOperatorIds = truckToUpdate.assignedOperatorIds.filter(id => id !== operatorId);
      const updatedTruck = { ...truckToUpdate, assignedOperatorIds: updatedAssignedOperatorIds };
      
      // Use the new status determination function
      const newStatus = determineTruckStatus(updatedTruck);

      setOperators(prevOperators => {
        return prevOperators.map(operator => {
          if (operator.id === operatorId) {
            const updatedAssignedTrucks = operator.assignedTrucks.filter(t => t.id !== truckId);
            return {
              ...operator,
              assignedTrucks: updatedAssignedTrucks,
              status: updatedAssignedTrucks.length === 0 ? 'Available' : 'Busy',
            };
          }
          return operator;
        });
      });

      return prevTrucks.map(truck => truck.id === truckId ? { ...updatedTruck, status: newStatus } : truck);
    });
  }, [determineTruckStatus]);

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
        
        // Use the new status determination function
        const newStatus = determineTruckStatus({ ...updatedTruck, deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate });
        
        return { ...updatedTruck, deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate, status: newStatus };
      }
      return truck;
    }));
    return success;
  }, [calculateTruckTimeEstimates, determineTruckStatus]);

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

        // Use the new status determination function
        const newStatus = determineTruckStatus({ ...updatedTruck, deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate });
        
        return { ...updatedTruck, deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate, status: newStatus };
      }
      return truck;
    }));
  }, [calculateTruckTimeEstimates, determineTruckStatus]);

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

        // Use the new status determination function
        const newStatus = determineTruckStatus({ ...updatedTruck, deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate });
        
        return { ...updatedTruck, deviationTimeEstimate, missingPartsTimeEstimate, repairTimeEstimate, status: newStatus };
      }
      return truck;
    }));
  }, [calculateTruckTimeEstimates, determineTruckStatus]);

  const markTruckComplete = useCallback((truckId: string) => {
    setTrucks(prevTrucks => {
      const truckToComplete = prevTrucks.find(truck => truck.id === truckId);
      if (!truckToComplete) return prevTrucks;

      const allDeviationsCompleted = truckToComplete.deviations.every(dev => dev.completed);
      const allMissingPartsCompleted = truckToComplete.missingParts.every(mp => mp.completed);
      const customerAdaptationCompleted = truckToComplete.customerAdaptationWork === null || truckToComplete.customerAdaptationCompleted;

      if (allDeviationsCompleted && allMissingPartsCompleted && customerAdaptationCompleted) {
        const completedTruck = {
          ...truckToComplete,
          status: 'Completed', // Explicitly set to Completed
          assignedOperatorIds: [], // Unassign all operators
          readyForDeliveryWithOpenIssues: false, // Reset this flag if completed
          deliveryDecisionNotes: undefined, // Clear notes
        };

        setOperators(prevOperators => {
          return prevOperators.map(operator => {
            const updatedAssignedTrucks = operator.assignedTrucks.filter(t => t.id !== truckId);
            return {
              ...operator,
              assignedTrucks: updatedAssignedTrucks,
              status: updatedAssignedTrucks.length === 0 ? 'Available' : 'Busy',
            };
          });
        });

        return prevTrucks.map(truck => truck.id === truckId ? completedTruck : truck);
      } else {
        console.warn(`AppContext.tsx: Attempted to mark truck ${truckToComplete.name} as completed, but not all work is done.`);
        return prevTrucks;
      }
    });
  }, []);

  const markTruckReadyForDeliveryWithOpenIssues = useCallback((truckId: string, notes: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId) {
        const updatedTruck = {
          ...truck,
          readyForDeliveryWithOpenIssues: true,
          deliveryDecisionNotes: notes,
          status: 'Ready for Delivery with Open Issues', // Explicitly set status
        };
        // No need to recalculate time estimates here, as work is still open
        return updatedTruck;
      }
      return truck;
    }));
  }, []);

  const prioritizedTrucks = useMemo(() => {
    if (!Array.isArray(trucks)) {
      return [];
    }
    const eligibleTrucks = trucks.filter(truck => 
      truck.status !== 'Completed' && 
      truck.status !== 'Missing Parts Not Available' &&
      truck.status !== 'Not Ready' &&
      truck.status !== 'Overdue - Not Ready' &&
      truck.status !== 'Ready for Delivery with Open Issues' // Exclude trucks already flagged
    );

    return [...eligibleTrucks].sort((a, b) => {
      const scoreA = getPriorityScore(a, getCalculatedDueDate(a)).totalScore;
      const scoreB = getPriorityScore(b, getCalculatedDueDate(b)).totalScore;
      return scoreB - scoreA;
    });
  }, [trucks, getCalculatedDueDate, useDeliveryDateForCalculations]);

  const overdueTrucksForReport = useMemo(() => {
    if (!Array.isArray(trucks)) {
      return [];
    }
    const today = new Date();
    return trucks.filter(truck => {
      const calculatedDueDate = getCalculatedDueDate(truck);
      const isOverdue = isPast(calculatedDueDate, today);
      const hasOpenDeviations = truck.deviations.some(d => !d.completed);
      const hasOpenMissingParts = truck.missingParts.some(mp => !mp.completed);
      const hasOpenCustomerAdaptation = truck.customerAdaptationWork && !truck.customerAdaptationCompleted;

      // Include trucks that are overdue AND have any open work (deviations, missing parts, customer adaptation)
      // AND are not already marked as 'Completed' or 'Ready for Delivery with Open Issues'
      return isOverdue &&
             (hasOpenDeviations || hasOpenMissingParts || hasOpenCustomerAdaptation) &&
             truck.status !== 'Completed' &&
             truck.status !== 'Ready for Delivery with Open Issues';
    }).sort((a, b) => {
      // Sort by calculated due date (earliest first)
      return getCalculatedDueDate(a).getTime() - getCalculatedDueDate(b).getTime();
    });
  }, [trucks, getCalculatedDueDate]);

  const contextValue = {
    trucks,
    operators,
    marketInvoiceDeltas,
    updateTruck,
    updateOperator,
    updateMarketInvoiceDelta,
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
    prioritizedTrucks,
    useDeliveryDateForCalculations,
    setUseDeliveryDateForCalculations: useCallback((value: boolean) => {
      setUseDeliveryDateForCalculations(value);
    }, []),
    getCalculatedDueDate,
    markTruckReadyForDeliveryWithOpenIssues, // New
    overdueTrucksForReport, // New
  };

  console.log('AppProvider: Providing context value.');
  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    console.error('useAppContext: Context is undefined. This component is likely outside AppProvider.');
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export default AppProvider;

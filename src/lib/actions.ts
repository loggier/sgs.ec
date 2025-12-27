
'use server';

import { revalidatePath } from 'next/cache';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  where,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { ClientSchema, type Client, type ClientDisplay } from './schema';
import type { User } from './user-schema';
import { getPgpsClients } from './pgps-actions';
import { getAllUnits } from './unit-actions';
import { getInstallationOrders } from './installation-order-actions';
import { getWorkOrders } from './work-order-actions';


// Helper function to convert Firestore Timestamps to a document
const convertTimestamps = (docData: any) => {
  const data = { ...docData };
  for (const key in data) {
    if (data[key] instanceof Timestamp) {
      // Convert Timestamp to ISO string for serialization
      data[key] = data[key].toDate().toISOString();
    }
  }
  return data;
};

// Gets locally stored clients and enriches them
export async function getClients(userId: string, userRole: User['role'], creatorId?: string): Promise<ClientDisplay[]> {
    if (!userId) return [];
  
    try {
      // 1. Get main data in parallel
      const [allUnits, usersSnapshot] = await Promise.all([
        getAllUnits({ id: userId, role: userRole, creatorId } as User),
        getDocs(collection(db, 'users'))
      ]);

      const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data() as User]));
      
      // 2. Get clients based on role
      let clientsQuery;
      const clientsCollectionRef = collection(db, 'clients');
      const ownerIdToFilter = userRole === 'analista' && creatorId ? creatorId : userId;
  
      if (userRole === 'master') {
        clientsQuery = query(clientsCollectionRef);
      } else {
        clientsQuery = query(clientsCollectionRef, where('ownerId', '==', ownerIdToFilter));
      }
      
      const clientSnapshot = await getDocs(clientsQuery);
      if (clientSnapshot.empty) {
        return [];
      }

      // 3. Process and enrich clients
      const enrichedClients = clientSnapshot.docs.map(doc => {
          const clientData = convertTimestamps(doc.data()) as Client;
          const clientUnits = allUnits.filter(u => u.clientId === doc.id);
          
          const financials = clientUnits.reduce((acc, unit) => {
              if (unit.tipoContrato === 'con_contrato') {
                  acc.totalContractAmount += unit.costoTotalContrato ?? 0;
                  // If saldoContrato is undefined or null, use the full contract cost as balance
                  acc.totalContractBalance += unit.saldoContrato ?? unit.costoTotalContrato ?? 0;
                  const monthlyContractPayment = (unit.costoTotalContrato ?? 0) / (unit.mesesContrato || 1);
                  acc.totalMonthlyPayment += monthlyContractPayment;
              } else {
                  acc.totalMonthlyPayment += unit.costoMensual ?? 0;
              }
              return acc;
          }, { totalContractAmount: 0, totalContractBalance: 0, totalMonthlyPayment: 0 });

          const ownerName = clientData.ownerId ? usersMap.get(clientData.ownerId)?.nombre || 'Desconocido' : 'Desconocido';

          return {
            id: doc.id,
            ...clientData,
            ...financials,
            unitCount: clientUnits.length,
            ownerName: userRole === 'master' ? ownerName : undefined,
          };
      });

      return enrichedClients;
    } catch (error) {
      console.error("Error getting and enriching clients:", error);
      return [];
    }
}
  
export async function getClientById(id: string, user: User): Promise<ClientDisplay | undefined> {
     if (!user) return undefined;
  
    try {
      const clientDocRef = doc(db, 'clients', id);
      const clientDoc = await getDoc(clientDocRef);
      if (!clientDoc.exists()) {
        return undefined;
      }
  
      const data = convertTimestamps(clientDoc.data()) as Client;
      
      // Determine whose clients the current user is allowed to see.
      const allowedOwnerId = user.role === 'analista' && user.creatorId ? user.creatorId : user.id;

      // Master can see everything. Others can only see clients belonging to their allowed scope.
      if (user.role !== 'master' && data.ownerId !== allowedOwnerId) {
          return undefined;
      }
      
      let clientData: ClientDisplay = { id: clientDoc.id, ...data };
      
      if (user.role === 'master' && data.ownerId) {
          const ownerDocRef = doc(db, 'users', data.ownerId);
          const ownerDoc = await getDoc(ownerDocRef);
          if (ownerDoc.exists()) {
              clientData.ownerName = (ownerDoc.data() as User).nombre;
          }
      }
  
      return clientData;
    } catch (error)
    {
      console.error("Error getting client by ID:", error);
      return undefined;
    }
}

export async function saveClient(
    data: Omit<Client, 'id' | 'ownerId'>,
    user: User,
    clientId?: string
  ): Promise<{ success: boolean; message: string; client?: ClientDisplay; }> {
    if (!user) {
        return { success: false, message: 'No se pudo identificar al usuario.' };
    }
    
    if (!['master', 'manager', 'analista'].includes(user.role)) {
        return { success: false, message: 'No tiene permiso para guardar clientes.' };
    }

    // Correctly determine the owner of the client.
    // If the creator is an analyst, the owner is their manager (creatorId).
    const ownerId = user.role === 'analista' && user.creatorId ? user.creatorId : user.id;
    if (!ownerId) {
         return { success: false, message: 'No se pudo determinar el propietario del cliente.' };
    }

    const dataWithOwner = { ...data, ownerId: ownerId };
    const validation = ClientSchema.omit({ id: true }).safeParse(dataWithOwner);
  
    if (!validation.success) {
      console.error(validation.error.flatten().fieldErrors);
      return { success: false, message: 'Datos proporcionados no válidos.' };
    }
  
    const { ...clientData } = validation.data;
  
    try {
        const dataToSave: { [key: string]: any } = { ...clientData };
        let pgpsLinkMessage = '';

        const apiEmail = clientData.usuario ? clientData.usuario.trim().toLowerCase() : '';
        
        if (apiEmail) {
            const q = query(collection(db, 'clients'), where("usuario", "==", apiEmail), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty && querySnapshot.docs[0].id !== clientId) {
                return { success: false, message: 'El Usuario (API) ya está en uso por otro cliente.' };
            }
            
            const { clients: pgpsClients, error: pgpsError } = await getPgpsClients();
            if (pgpsError) {
              return { success: false, message: `No se pudo guardar: ${pgpsError}`};
            }
            
            const matchedPgpsClient = pgpsClients.find(wc => wc.correo?.trim().toLowerCase() === apiEmail);
            if (matchedPgpsClient) {
              dataToSave.pgpsId = matchedPgpsClient.id!.replace('pgps-', '');
              pgpsLinkMessage = 'Cliente vinculado a P. GPS exitosamente.';
            } else {
              dataToSave.pgpsId = null;
              pgpsLinkMessage = 'No se encontró un cliente coincidente en P. GPS para vincular.';
            }
        } else {
            dataToSave.pgpsId = null;
        }

        Object.keys(dataToSave).forEach(key => {
            const K = key as keyof typeof dataToSave;
            if (dataToSave[K] === null || dataToSave[K] === undefined || dataToSave[K] === '') {
                delete dataToSave[K];
            }
        });
      
        let savedClientId = clientId;
        if (clientId) {
            const clientDocRef = doc(db, 'clients', clientId);
            const currentClientDoc = await getDoc(clientDocRef);
            if (!currentClientDoc.exists()) {
                return { success: false, message: 'Cliente no encontrado.' };
            }
            
            const currentOwnerId = currentClientDoc.data()?.ownerId;
            const allowedOwnerId = user.role === 'analista' ? user.creatorId : user.id;

            const canEdit = user.role === 'master' || currentOwnerId === allowedOwnerId;

            if (!canEdit) {
                return { success: false, message: 'No tiene permiso para editar este cliente.' };
            }
            await updateDoc(clientDocRef, dataToSave);
        } else {
            const clientsCollection = collection(db, 'clients');
            const newClientRef = await addDoc(clientsCollection, dataToSave);
            savedClientId = newClientRef.id;
        }
  
      revalidatePath('/clients');
      const savedClient = await getClientById(savedClientId!, user);
      const baseMessage = `Cliente ${clientId ? 'actualizado' : 'creado'} con éxito.`;
      return {
        success: true,
        message: `${baseMessage} ${pgpsLinkMessage}`,
        client: savedClient,
      };
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      return { success: false, message: `Error al guardar el cliente: ${errorMessage}` };
    }
}
  
export async function deleteClient(id: string, user: User): Promise<{ success: boolean; message: string }> {
     if (!user) {
         return { success: false, message: 'Acción no permitida.' };
     }
  
     try {
      const clientDocRef = doc(db, 'clients', id);
      const clientDoc = await getDoc(clientDocRef);
      if (!clientDoc.exists()) {
        return { success: false, message: 'Cliente no encontrado.' };
      }
     
      const clientOwnerId = clientDoc.data()?.ownerId;
      const allowedOwnerId = user.role === 'analista' ? user.creatorId : user.id;
      const canDelete = user.role === 'master' || clientOwnerId === allowedOwnerId;

      if (!canDelete) {
          return { success: false, message: 'No tiene permiso para eliminar este cliente.' };
      }
  
      const unitsCollectionRef = collection(db, 'clients', id, 'units');
      const unitsSnapshot = await getDocs(unitsCollectionRef);
      const deletePromises = unitsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
  
      await deleteDoc(doc(db, 'clients', id));
      
      revalidatePath('/clients');
      revalidatePath(`/clients/${id}/units`);
      return { success: true, message: 'Cliente y todas sus unidades eliminados con éxito.' };
    } catch (error) {
      console.error("Error deleting client:", error);
      return { success: false, message: 'Error al eliminar el cliente.' };
    }
}

export async function getDashboardData(user: User) {
    const [allUnits, clients, installationOrders, workOrders, allUsersSnapshot] = await Promise.all([
        getAllUnits(user),
        getClients(user.id, user.role, user.creatorId),
        getInstallationOrders(user),
        getWorkOrders(user),
        getDocs(collection(db, 'users')),
    ]);

    const techniciansMap = new Map(allUsersSnapshot.docs
        .filter(doc => doc.data().role === 'tecnico')
        .map(doc => [doc.id, doc.data() as User])
    );

    const overdueUnits = allUnits.filter(unit => unit.fechaSiguientePago && new Date(unit.fechaSiguientePago) < new Date()).length;
    
    const totalMonthlyRevenue = allUnits.reduce((sum, unit) => {
        if (unit.tipoContrato === 'con_contrato' && unit.mesesContrato) {
          const monthlyCost = (unit.costoTotalContrato ?? 0) / unit.mesesContrato;
          return sum + monthlyCost;
        }
        return sum + (unit.costoMensual ?? 0);
    }, 0);
    
    const topClients = [...clients]
        .sort((a, b) => (b.unitCount ?? 0) - (a.unitCount ?? 0))
        .slice(0, 3)
        .map(c => ({ name: c.nomSujeto, units: c.unitCount ?? 0 }));

    const completedWorkOrders = workOrders.filter(o => o.estado === 'completada');
    const completedInstallations = installationOrders.filter(o => o.estado === 'terminado');

    const techWorkCounts = [...completedWorkOrders, ...completedInstallations].reduce((acc, order) => {
        if (order.tecnicoId) {
            acc[order.tecnicoId] = (acc[order.tecnicoId] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const topTechnicians = Object.entries(techWorkCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([techId, count]) => ({
            name: techniciansMap.get(techId)?.nombre || techniciansMap.get(techId)?.username || 'Desconocido',
            jobs: count,
        }));
        
    const recentActivity = [...completedWorkOrders, ...completedInstallations]
        .sort((a, b) => new Date(b.fechaProgramada).getTime() - new Date(a.fechaProgramada).getTime())
        .slice(0, 5)
        .map(order => ({
            id: order.id,
            type: 'descripcion' in order ? 'Soporte' : 'Instalación', // Check if it's a work order or installation
            clientName: order.nombreCliente,
            plate: order.placaVehiculo,
            date: new Date(order.fechaProgramada).toISOString(),
        }));


    return {
        totalClients: clients.length,
        totalUnits: allUnits.length,
        overdueUnits,
        totalMonthlyRevenue,
        topClients,
        topTechnicians,
        recentActivity,
        unitsByPlan: allUnits.reduce((acc, unit) => {
            const plan = unit.tipoPlan || 'desconocido';
            acc[plan] = (acc[plan] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        clientsByStatus: clients.reduce((acc, client) => {
            const status = client.estado || 'desconocido';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        installationsByCategory: installationOrders.reduce((acc, order) => {
            const category = order.categoriaInstalacion || 'desconocido';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        installationsByVehicle: installationOrders.reduce((acc, order) => {
            const vehicle = order.tipoVehiculo || 'desconocido';
            acc[vehicle] = (acc[vehicle] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        installationsBySegment: installationOrders.reduce((acc, order) => {
            const segment = order.segmento || 'desconocido';
            acc[segment] = (acc[segment] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        workOrdersByPriority: workOrders.reduce((acc, order) => {
            const priority = order.prioridad || 'desconocido';
            acc[priority] = (acc[priority] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
    };
}
    








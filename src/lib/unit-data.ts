import type { Unit } from './unit-schema';

// This is a mock database for units.
export let units: Unit[] = [
    {
        id: 'unit-1',
        clientId: '1',
        imei: '123456789012345',
        placa: 'PCQ-1234',
        modelo: 'Toyota Yaris',
        tipoPlan: 'anual',
        fechaInstalacion: new Date('2023-01-15'),
        fechaVencimiento: new Date('2024-01-15'),
        monto: 240.00,
        ultimaRenovacion: new Date('2023-01-15'),
        ultimoPago: new Date('2023-01-15'),
        fechaSiguientePago: new Date('2024-01-15'),
        observacion: 'Instalación estándar.',
    },
    {
        id: 'unit-2',
        clientId: '2',
        imei: '543210987654321',
        placa: 'GTR-5678',
        modelo: 'Chevrolet Spark',
        tipoPlan: 'mensual',
        fechaInstalacion: new Date('2022-11-20'),
        fechaVencimiento: new Date('2023-12-20'),
        monto: 25.00,
        ultimaRenovacion: new Date('2023-11-20'),
        ultimoPago: new Date('2023-11-20'),
        fechaSiguientePago: new Date('2023-12-20'),
        observacion: 'Cliente solicitó pago mensual.',
    },
];

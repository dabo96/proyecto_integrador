export interface Contacto {
  id: string;
  nombre: string;
  descripcion: string;
  tiempo?: string;
  avatar?: string;
  tipo?: string;
}

/** ---- DATOS SIMULADOS ---- */
let contactosData: Contacto[] = [
  {
    id: '1',
    nombre: 'Carlos Mendoza',
    descripcion: 'Diseñador Gráfico',
    tiempo: 'Activo hace 10 min',
    avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
  },
  {
    id: '2',
    nombre: 'María López',
    descripcion: 'Marketing Digital',
    tiempo: 'Activo hace 2 horas',
    avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
  },
  {
    id: '3',
    nombre: 'María López',
    descripcion: 'Marketing Digital',
    tiempo: 'Activo hace 2 horas',
    avatar: 'https://randomuser.me/api/portraits/women/67.jpg',
  },
  {
    id: '4',
    nombre: 'María López',
    descripcion: 'Marketing Digital',
    tiempo: 'Activo hace 2 horas',
    avatar: 'https://randomuser.me/api/portraits/women/66.jpg',
  },
  {
    id: '5',
    nombre: 'María López',
    descripcion: 'Marketing Digital',
    tiempo: 'Activo hace 2 horas',
    
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
  {
    id: '6',
    nombre: 'María López',
    descripcion: 'Marketing Digital',
    tiempo: 'Activo hace 2 horas',
    avatar: 'https://randomuser.me/api/portraits/women/69.jpg',
  },
  {
    id: '7',
    nombre: 'sMaría López',
    descripcion: 'Influencer',
    tiempo: 'Activo hace 5 horas',
    avatar: 'https://randomuser.me/api/portraits/women/70.jpg',
  },
  {
    id: '8',
    nombre: 'José Ramírez',
    descripcion: 'desarrollador Mobile',
    tiempo: 'Activo hace 2 días',
    avatar: 'https://randomuser.me/api/portraits/women/71.jpg',
  },
];

let solicitudesData: Contacto[] = [
  {
    id: '10',
    nombre: 'Andrés Gómez',
    descripcion: 'Programador Full Stack',
    tiempo: 'Hace 1 día',
    avatar: 'https://randomuser.me/api/portraits/men/30.jpg',
  },
  {
    id: '11',
    nombre: 'Laura Torres',
    descripcion: 'UX Researcher',
    tiempo: 'Hace 3 días',
    avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
  },
];

/** Observadores (listeners) para sincronizar cambios entre pantallas */
const listeners: (() => void)[] = [];

export const suscribirContactos = (callback: () => void) => {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index !== -1) listeners.splice(index, 1);
  };
};

const notificarCambio = () => {
  listeners.forEach((cb) => cb());
};

/** ---- FUNCIONES ---- */
export const obtenerContactos = async () => {
  return new Promise<{ contactos: Contacto[]; solicitudes: Contacto[] }>((resolve) => {
    setTimeout(() => {
      resolve({
        contactos: contactosData,
        solicitudes: solicitudesData,
      });
    }, 500);
  });
};

export const aceptarSolicitud = (id: string) => {
  const solicitud = solicitudesData.find((s) => s.id === id);
  if (solicitud) {
    solicitudesData = solicitudesData.filter((s) => s.id !== id);
    contactosData.push(solicitud);
    notificarCambio(); // 🔁 notifica a las pantallas (Profile y Contacts)
  }
};

export const rechazarSolicitud = (id: string) => {
  solicitudesData = solicitudesData.filter((s) => s.id !== id);
  notificarCambio();
};

export const obtenerNumeroContactos = () => contactosData.length;

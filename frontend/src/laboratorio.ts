// Datos documentados del laboratorio GNS3 (dispositivos.yaml + topología real).
// No son telemetría en vivo: la API solo monitorea R1, SW1 y SW2.

export interface HostLaboratorio {
  nombre: string;
  ip: string;
  vlan: number;
  conectadoA: "SW1" | "SW2";
  interfazEquipo: string;
}

export interface EnlaceTrunk {
  desde: string;
  hacia: string;
  interfazDesde: string;
  interfazHacia: string;
}

export interface VlanLaboratorio {
  id: number;
  subred: string;
  funcion: string;
  color: string;
  colorBg: string;
}

export const RED_GESTION = "192.168.56.0/24";

export const ENLACES_TRUNK: EnlaceTrunk[] = [
  {
    desde: "R1",
    hacia: "SW1",
    interfazDesde: "ether2",
    interfazHacia: "ether2",
  },
  {
    desde: "SW1",
    hacia: "SW2",
    interfazDesde: "ether3",
    interfazHacia: "ether2",
  },
];

export const HOSTS_LABORATORIO: HostLaboratorio[] = [
  {
    nombre: "PC-ADMIN",
    ip: "192.168.10.10",
    vlan: 10,
    conectadoA: "SW1",
    interfazEquipo: "ether4",
  },
  {
    nombre: "PC-VEN1",
    ip: "192.168.20.10",
    vlan: 20,
    conectadoA: "SW2",
    interfazEquipo: "ether3",
  },
  {
    nombre: "PC-VEN2",
    ip: "192.168.20.11",
    vlan: 20,
    conectadoA: "SW2",
    interfazEquipo: "ether4",
  },
  {
    nombre: "SRV1",
    ip: "192.168.30.10",
    vlan: 30,
    conectadoA: "SW2",
    interfazEquipo: "ether5",
  },
];

export const VLANS_LABORATORIO: VlanLaboratorio[] = [
  {
    id: 10,
    subred: "192.168.10.0/24",
    funcion: "Administración",
    color: "#20D9E8",
    colorBg: "#0a2226",
  },
  {
    id: 20,
    subred: "192.168.20.0/24",
    funcion: "Ventas",
    color: "#FFB547",
    colorBg: "#292014",
  },
  {
    id: 30,
    subred: "192.168.30.0/24",
    funcion: "Servidores",
    color: "#00D6A0",
    colorBg: "#09251F",
  },
];

export function vlanPorId(id: number): VlanLaboratorio | undefined {
  return VLANS_LABORATORIO.find((v) => v.id === id);
}

export function hostsDeEquipo(nombre: string): HostLaboratorio[] {
  return HOSTS_LABORATORIO.filter((h) => h.conectadoA === nombre.toUpperCase());
}

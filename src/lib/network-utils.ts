import { networkInterfaces } from 'os'

export function getLocalNetworkIPs(): string[] {
  const interfaces = networkInterfaces()
  const ips: string[] = []

  for (const name of Object.keys(interfaces)) {
    const netInterface = interfaces[name]
    if (!netInterface) continue

    for (const net of netInterface) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address)
      }
    }
  }

  return ips
}

export function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  
  // 10.0.0.0 - 10.255.255.255
  if (parts[0] === 10) return true
  
  // 172.16.0.0 - 172.31.255.255
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  
  // 192.168.0.0 - 192.168.255.255
  if (parts[0] === 192 && parts[1] === 168) return true
  
  return false
}

export function getPreferredNetworkIP(): string | null {
  const ips = getLocalNetworkIPs()
  
  // Prefer private network IPs
  const privateIPs = ips.filter(isPrivateIP)
  if (privateIPs.length > 0) {
    // Prefer 192.168.x.x over others (most common home/office networks)
    const homeNetworkIPs = privateIPs.filter(ip => ip.startsWith('192.168.'))
    if (homeNetworkIPs.length > 0) {
      return homeNetworkIPs[0]
    }
    return privateIPs[0]
  }
  
  // Fall back to any available IP
  return ips[0] || null
}

export function formatNetworkInfo(port: number): string[] {
  const ips = getLocalNetworkIPs()
  const info: string[] = []
  
  info.push(`Local: http://localhost:${port}`)
  
  ips.forEach(ip => {
    const label = isPrivateIP(ip) ? 'Network' : 'Public'
    info.push(`${label}: http://${ip}:${port}`)
  })
  
  return info
}
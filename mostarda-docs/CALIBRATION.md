# 🔧 Calibração

## WiFi (scapy)

```bash
# Ativar modo monitor
sudo ip link set wlan0 down
sudo iw dev wlan0 set type monitor
sudo ip link set wlan0 up
# Testar
sudo python main.py --sniffer-only
```

| RSSI | Distância | Conta? |
|:----:|:---------:|:------:|
| > -50 dBm | < 1m | ✅ |
| -50 a -70 dBm | 1-7m | ✅ |
| < -70 dBm | > 7m | ❌ |

## Câmera (MediaPipe)

- Resolução: 640×480
- Confiança mínima: 0.5
- Distância TV-câmera: 2-4m
- LGPD: Nenhuma imagem armazenada

## ZEROONE Mini PC

| Componente | Recomendado |
|-----------|:-----------:|
| CPU | Quad-core 2.0GHz |
| RAM | 4 GB |
| Armazenamento | 32 GB SSD |
| SO | Debian 12 / Ubuntu 22.04 |

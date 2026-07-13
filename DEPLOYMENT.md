# Deploy na Oracle Cloud Always Free Tier

## Especificações
- 2 CPUs ARM Ampere A1
- 12 GB RAM
- 200 GB SSD
- 10 TB rede/mês
- **Custo: R$ 0,00**

## Passo a Passo

### 1. Criar Instância
1. Oracle Cloud → Compute → Instances → Create Instance
2. Image: Canonical Ubuntu 22.04 (ARM64)
3. Shape: VM.Standard.A1.Flex (2 OCPUs, 12 GB RAM)
4. Add SSH key
5. Create

### 2. Acessar VPS
```bash
ssh ubuntu@<IP_DA_VPS>
```

### 3. Instalar Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
exit  # reconecte
```

### 4. Clonar e Rodar
```bash
git clone https://github.com/Vmont-Tech/mostarda-backend.git
cd mostarda-backend
docker compose up -d
```

### 5. Nginx + SSL (opcional)
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
sudo nano /etc/nginx/sites-available/mostarda
# Configure reverse proxy para localhost:3001
sudo certbot --nginx -d api.mostarda.app
```

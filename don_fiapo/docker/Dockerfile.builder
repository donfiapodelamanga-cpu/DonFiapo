# Ambiente de build para contratos ink! compatível com Lunes Network
# Baseado no mesmo stack do PIDChat: nightly Linux + cargo-contract 5.0.3
FROM rust:latest

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    binaryen \
    clang \
    cmake \
    curl \
    git \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Instalar toolchain nightly e componentes necessários
RUN rustup install nightly && \
    rustup default nightly && \
    rustup component add rust-src --toolchain nightly && \
    rustup target add wasm32-unknown-unknown --toolchain nightly

# Instalar cargo-contract (mesmo usado pelo PIDChat)
RUN cargo install --force --locked cargo-contract

# Verificar instalação
RUN cargo --version && \
    rustc --version && \
    cargo-contract --version

# Diretório de trabalho
WORKDIR /workspace

# Copiar código fonte
COPY . /workspace/

# Comando padrão: compilar todos os contratos
CMD ["bash", "/workspace/docker/build_contracts.sh"]

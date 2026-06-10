# Ambiente de build para contratos ink! 5.x compatível com Lunes Network
# cargo-contract 5.x + Rust stable — par correto para ink! 5.x
# Rust 1.82+ resolve o problema do panic_immediate_abort do cargo-contract 4.x/3.x
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

# Instalar componentes necessários para WASM
RUN rustup component add rust-src && \
    rustup target add wasm32-unknown-unknown

# Instalar cargo-contract 5.x — compatível com ink! 5.x e Rust stable moderno
RUN cargo install --force cargo-contract

# Verificar instalação e compatibilidade
RUN cargo --version && \
    rustc --version && \
    cargo contract --version && \
    echo "✅ Build environment ready (ink! 5.x + cargo-contract 5.x)"

# Diretório de trabalho
WORKDIR /workspace

# Copiar código fonte
COPY . /workspace/

# Comando padrão: compilar todos os contratos
CMD ["bash", "/workspace/docker/build_contracts.sh"]

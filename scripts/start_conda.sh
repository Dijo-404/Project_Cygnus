#!/bin/bash

# Configuration
CONDA_ENV_PATH="/home/dj/miniconda3/envs/Project_Cygnus"
CONDA_BIN="$CONDA_ENV_PATH/bin"

# Check if the Conda environment exists
if [ ! -d "$CONDA_BIN" ]; then
    echo "Error: Conda environment not found at $CONDA_ENV_PATH"
    echo "Please ensure the environment is created and the path is correct."
    exit 1
fi

# Prepend Conda bin to PATH
export PATH="$CONDA_BIN:$PATH"

# Execute the command passed as arguments
exec "$@"

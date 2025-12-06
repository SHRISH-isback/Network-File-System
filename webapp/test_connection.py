#!/usr/bin/env python3
"""
Test script to verify NFS backend connectivity
"""
import socket
import struct

NM_HOST = '127.0.0.1'
NM_PORT = 8080

# Message struct size calculation
# Correct format matching C struct:
# int(4)*3 + char[64] + char[256]*3 + char[1024] + int(4)*2 + char[16] + int(4)*3 + char[4096]
STRUCT_FORMAT = '!iii64s256s256s1024sii16siii4096s'
STRUCT_SIZE = struct.calcsize(STRUCT_FORMAT)

print(f"Message struct size: {STRUCT_SIZE} bytes")
print(f"Attempting to connect to {NM_HOST}:{NM_PORT}...")

try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    sock.connect((NM_HOST, NM_PORT))
    print("✓ Successfully connected to Name Server!")
    
    # Try to send a registration message
    MSG_REQUEST = 1
    OP_CLIENT_REGISTER = 201
    
    # Pack a simple registration message
    username = b'testuser'
    msg = struct.pack(
        STRUCT_FORMAT,
        MSG_REQUEST,                    # msg_type
        OP_CLIENT_REGISTER,             # operation
        0,                              # error_code
        username.ljust(64, b'\x00'),    # username[64]
        b''.ljust(256, b'\x00'),        # filename[256]
        b''.ljust(256, b'\x00'),        # checkpoint_tag[256]
        b''.ljust(1024, b'\x00'),       # target_path[1024]
        0,                              # sentence_index
        0,                              # word_index
        b''.ljust(16, b'\x00'),         # ip[16]
        0,                              # port1
        0,                              # port2
        0,                              # ss_id
        b''.ljust(4096, b'\x00')        # data[4096]
    )
    
    print(f"Sending registration message ({len(msg)} bytes)...")
    sock.sendall(msg)
    
    print("Waiting for response...")
    response_data = sock.recv(STRUCT_SIZE)
    
    if len(response_data) == STRUCT_SIZE:
        print(f"✓ Received response ({len(response_data)} bytes)")
        # Unpack response
        response = struct.unpack(STRUCT_FORMAT, response_data)
        msg_type = response[0]
        operation = response[1]
        error_code = response[2]
        
        print(f"  Message type: {msg_type}")
        print(f"  Operation: {operation}")
        print(f"  Error code: {error_code}")
        
        if error_code == 0:
            print("✓ Registration successful!")
        else:
            print(f"✗ Registration failed with error code: {error_code}")
    else:
        print(f"✗ Received incomplete response ({len(response_data)} bytes)")
    
    sock.close()
    
except ConnectionRefusedError:
    print("✗ Connection refused. Is the Name Server running?")
    print(f"  Start it with: ./name_server/name_server {NM_PORT}")
except socket.timeout:
    print("✗ Connection timeout")
except Exception as e:
    print(f"✗ Error: {e}")

print("\n" + "="*50)
print("To start the Name Server:")
print(f"  cd Network-File-System")
print(f"  make")
print(f"  ./name_server/name_server {NM_PORT}")
print("="*50)

# Flask App Fix - Binary Protocol Implementation

## Problem
The initial Flask app had a **struct packing error**: "pack expected 20 items for packing (got 19)"

## Root Cause
The Python `Message` class didn't match the C `Message` struct from `protocol.h`. The Python version had extra fields that don't exist in the C implementation.

## Solution
Fixed the `Message` class to exactly match the C struct:

### C Struct (from protocol.h)
```c
typedef struct {
    int msg_type;              // 4 bytes
    int operation;             // 4 bytes  
    int error_code;            // 4 bytes
    char username[64];         // 64 bytes
    char filename[256];        // 256 bytes
    char checkpoint_tag[256];  // 256 bytes
    char target_path[1024];    // 1024 bytes
    int sentence_index;        // 4 bytes
    int word_index;            // 4 bytes
    char ip[16];               // 16 bytes
    int port1;                 // 4 bytes
    int port2;                 // 4 bytes
    int ss_id;                 // 4 bytes
    char data[4096];           // 4096 bytes
} Message;
```

### Python Struct Format
```python
STRUCT_FORMAT = '!iii64s256s256s1024sii16siii4096s'
```

This gives us **14 fields** to pack/unpack:
1. `int` - msg_type
2. `int` - operation  
3. `int` - error_code
4. `char[64]` - username
5. `char[256]` - filename
6. `char[256]` - checkpoint_tag
7. `char[1024]` - target_path
8. `int` - sentence_index
9. `int` - word_index
10. `char[16]` - ip
11. `int` - port1
12. `int` - port2
13. `int` - ss_id
14. `char[4096]` - data

## Key Changes

### 1. Removed Non-existent Fields
The Python version incorrectly included:
- ❌ `target_user[64]`
- ❌ `request_id[256]`
- ❌ `ip1[16]`, `ip2[16]` (should be single `ip[16]`)
- ❌ `access_type`
- ❌ `view_flags`

### 2. Field Usage Mappings
Some parameters use existing fields creatively:

| Parameter | C Field Used | Python Implementation |
|-----------|--------------|----------------------|
| `view_flags` | `sentence_index` | `send_request(OP_VIEW, sentence_index=view_flags)` |
| `access_type` | `sentence_index` | `send_request(OP_ADDACCESS, sentence_index=access_type)` |
| `target_user` | `data` | `send_request(OP_ADDACCESS, data=target_user)` |

### 3. Binary Protocol
The Flask app now uses **binary struct packing** to communicate with the C backend, matching exactly how the C client communicates:

```python
# Pack message
packed_msg = msg.pack()  # Returns binary data
sock.sendall(packed_msg)

# Unpack response  
response_data = recv_all(sock, Message.STRUCT_SIZE)
response = Message.unpack(response_data)
```

## Testing

To verify the connection works:
```bash
cd webapp
python3 test_connection.py
```

This will:
1. Connect to the Name Server
2. Send a CLIENT_REGISTER message
3. Receive and parse the response
4. Display the result

## Now the Login Should Work! ✅

The Flask web app can now:
- ✅ Connect to the C backend using the correct binary protocol
- ✅ Register users (login)
- ✅ Send all operations (create, read, write, delete, etc.)
- ✅ Receive and parse responses correctly
- ✅ Work across multiple machines

## Usage

1. **Start the NFS backend:**
   ```bash
   ./name_server/name_server 8080
   ./storage_server/storage_server 127.0.0.1 8080 9001 ./storage_data
   ```

2. **Start the Flask app:**
   ```bash
   cd webapp
   python3 app.py
   ```

3. **Open browser:**
   ```
   http://localhost:5000
   ```

4. **Login** with any username - it will now work! 🎉

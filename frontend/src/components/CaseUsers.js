// frontend/src/components/CaseUsers.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CaseUsers({ token, caseId }) {
  const [users, setUsers] = useState([]);
  const [newUserId, setNewUserId] = useState('');
  const [newAccessLevel, setNewAccessLevel] = useState('read');

  useEffect(() => {
    fetchUsers();
  }, [caseId]);

  const fetchUsers = async () => {
    const res = await axios.get(`http://localhost:3000/api/cases/${caseId}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsers(res.data);
  };

  const addUser = async () => {
    await axios.post(
      `http://localhost:3000/api/cases/${caseId}/add-user`,
      { userId: newUserId, accessLevel: newAccessLevel },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchUsers();
    setNewUserId('');
  };

  const removeUser = async (userId) => {
    await axios.delete(`http://localhost:3000/api/cases/${caseId}/remove-user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUsers();
  };

  return (
    <div>
      <h3>Manage Users</h3>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.username} - {user.access_level}
            <button onClick={() => removeUser(user.id)}>Remove</button>
          </li>
        ))}
      </ul>
      <div>
        <input
          type="text"
          placeholder="User ID"
          value={newUserId}
          onChange={(e) => setNewUserId(e.target.value)}
        />
        <select value={newAccessLevel} onChange={(e) => setNewAccessLevel(e.target.value)}>
          <option value="read">Read</option>
          <option value="write">Write</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={addUser}>Add User</button>
      </div>
    </div>
  );
}

export default CaseUsers;
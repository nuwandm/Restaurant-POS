const API = 'http://localhost:3001/api';

if (!window.electron) {
  window.electron = {
    database: async (args) => {
      const res = await fetch(`${API}/db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      return res.json();
    },
    processPayment: async (data) => {
      const res = await fetch(`${API}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    printReceipt: async () => ({ success: true }),
    printKitchen: async () => ({ success: true }),
  };
}

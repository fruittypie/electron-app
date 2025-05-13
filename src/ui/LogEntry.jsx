import React, { useState } from 'react';

export default function LogEntry({ entry }) {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  const { type, text, product } = entry;

  // special UI for in-stock
  if (type === 'in-stock') {
    const [ordering, setOrdering] = useState(false);
    const [ordered,  setOrdered]  = useState(false);

    const handleYes = async () => {
      setOrdering(true);
      await window.electron.invoke('order-product', product);
      setOrdering(false);
      setOrdered(true);
    };
    const handleNo = () => {
      window.electron.invoke('skip-product', product);
    };

    return (
      <div className="mb-4 p-4 bg-white dark:bg-gray-700 rounded shadow">
        <div className="text-xs text-gray-500">{time}</div>
        <div className="mt-2 flex items-center">
          <img src={product.imageUrl}
               alt={product.title}
               className="w-16 h-16 object-cover rounded mr-4"/>
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {product.title}
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              Price: ${product.price}
            </div>
          </div>
        </div>
        {!ordered ? (
          <div className="mt-3 flex space-x-2">
            <button
              onClick={handleYes}
              disabled={ordering}
              className={`px-4 py-2 rounded text-white ${
                ordering
                  ? 'bg-green-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {ordering ? 'Ordering…' : 'Yes'}
            </button>
            <button
              onClick={handleNo}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
            >
              No
            </button>
          </div>
        ) : (
          <div className="mt-3 text-green-500 font-semibold">Ordered</div>
        )}
      </div>
    );
  }

  // plain log line
  return (
    <div className={`mb-2 ${type === 'error' ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>
      <span className="text-xs text-gray-500">{time} </span>
      {text}
    </div>
  );
}

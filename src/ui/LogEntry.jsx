import React, { useState } from 'react';

export default function LogEntry({ entry }) {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  const { type, text, product, components = [] } = entry;

  // If entry.components is non-empty, render an interactive card
  if (components.length > 0 && product) {
    const [clicked, setClicked] = useState(null); // 'yesId' or 'noId'
    const [pending, setPending] = useState(false);

    const handleClick = async (customId) => {
      setPending(true);
      // tell main process which button was clicked
      window.electron.send('inapp-order-click', customId);
      setClicked(customId);
      setPending(false);
    };

    return (
      <div className="mb-4 p-4 bg-white dark:bg-gray-700 rounded shadow">
        <div className="text-xs text-gray-500">{time}</div>
        <div className="mt-2 flex items-center">
          {product.imageUrl && (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-16 h-16 object-cover rounded mr-4"
            />
          )}
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {product.title}
            </div>
            {product.price && (
              <div className="text-gray-600 dark:text-gray-300">
                Price: ${product.price}
              </div>
            )}
            <div className="mt-1 text-gray-700 dark:text-gray-200">
              {text}
            </div>
          </div>
        </div>

        {/* Buttons */}
        {!clicked ? (
          <div className="mt-3 flex space-x-2">
            {components.map((c) => (
              <button
                key={c.customId}
                onClick={() => handleClick(c.customId)}
                disabled={pending}
                className={`px-4 py-2 rounded text-white ${
                  pending
                    ? 'bg-gray-400 cursor-not-allowed'
                    : c.style === 'success'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {pending
                  ? '…'
                  : c.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-green-500 font-semibold">
            {clicked.startsWith('order_yes') ? '✅ Ordered' : '❌ Skipped'}
          </div>
        )}
      </div>
    );
  }

  // Plain log entry
  return (
    <div className={`mb-2 ${type === 'error' ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>
      <span className="text-xs text-gray-500">{time} </span>
      {text}
    </div>
  );
}

/**
 * Admin Operation Queue
 *
 * Ensures that all admin deletion and demotion operations are processed sequentially.
 * This prevents race conditions where two admins try to delete each other simultaneously.
 *
 * When both operations enter the queue:
 * 1. First operation: checks adminCount = 2 → proceeds to delete/demote → adminCount becomes 1
 * 2. Second operation: checks adminCount = 1 → rejects with "Cannot delete/demote the last admin"
 */

const operationQueue = [];
let isProcessing = false;

/**
 * Queue an admin operation (delete or demotion) for sequential execution.
 * @param {Function} operationFn - Async function that performs the admin operation
 * @returns {Promise} Resolves when operation completes, rejects if operation fails
 */
export async function queueAdminOperation(operationFn) {
  return new Promise((resolve, reject) => {
    operationQueue.push({
      execute: operationFn,
      resolve,
      reject,
    });
    processQueue();
  });
}

async function processQueue() {
  if (isProcessing || operationQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (operationQueue.length > 0) {
    const operation = operationQueue.shift();

    try {
      const result = await operation.execute();
      operation.resolve(result);
    } catch (error) {
      operation.reject(error);
    }
  }

  isProcessing = false;
}

/**
 * Get current queue length (for debugging/monitoring)
 */
export function getQueueLength() {
  return operationQueue.length + (isProcessing ? 1 : 0);
}

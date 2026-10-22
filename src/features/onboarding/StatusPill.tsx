'use client';

import { AnimatePresence, motion } from 'motion/react';

export interface StatusPillProps {
  message: string | null;
  done?: boolean;
}

export function StatusPill({ message, done = false }: StatusPillProps) {
  return (
    <div aria-live="polite" className="min-h-8">
      <AnimatePresence>
        {message ? (
          <motion.div
            key="pill"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="inline-flex min-h-8 items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-3 pl-2.5 text-[13px]"
          >
            <span
              aria-hidden
              className={
                done
                  ? 'size-3 rounded-full bg-brand'
                  : 'size-3 animate-spin rounded-full border-[1.5px] border-line border-t-brand'
              }
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={message}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {message}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import styles from "./PaperPlaneButton.module.css";
import { useRouter } from "next/navigation";

interface PaperPlaneButtonProps {
  text?: string;
  successText?: string;
  onClick?: () => void;
  href?: string;
  className?: string;
  targetId?: string;
}

const PaperPlaneButton: React.FC<PaperPlaneButtonProps> = ({ 
  text = "See All Restaurants", 
  successText = "Let's Go!", 
  onClick,
  href,
  className,
  targetId
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    // Helper to get CSS variable value
    const getVar = (variable: string) => getComputedStyle(button).getPropertyValue(variable);

    const handleClick = (e: MouseEvent) => {
      e.preventDefault(); 

      // Use styles.active to match the CSS module class
      if (!button.classList.contains(styles.active)) {
        button.classList.add(styles.active);

        // Animation 1: Plane Geometry Changes
        gsap.to(button, {
          keyframes: [{
            '--left-wing-first-x': 50,
            '--left-wing-first-y': 100,
            '--right-wing-second-x': 50,
            '--right-wing-second-y': 100,
            duration: 0.2,
            onComplete() {
              gsap.set(button, {
                '--left-wing-first-y': 0,
                '--left-wing-second-x': 40,
                '--left-wing-second-y': 100,
                '--left-wing-third-x': 0,
                '--left-wing-third-y': 100,
                '--left-body-third-x': 40,
                '--right-wing-first-x': 50,
                '--right-wing-first-y': 0,
                '--right-wing-second-x': 60,
                '--right-wing-second-y': 100,
                '--right-wing-third-x': 100,
                '--right-wing-third-y': 100,
                '--right-body-third-x': 60
              });
            }
          }, {
            '--left-wing-third-x': 20,
            '--left-wing-third-y': 90,
            '--left-wing-second-y': 90,
            '--left-body-third-y': 90,
            '--right-wing-third-x': 80,
            '--right-wing-third-y': 90,
            '--right-body-third-y': 90,
            '--right-wing-second-y': 90,
            duration: 0.2
          }, {
            '--rotate': 50,
            '--left-wing-third-y': 95,
            '--left-wing-third-x': 27,
            '--right-body-third-x': 45,
            '--right-wing-second-x': 45,
            '--right-wing-third-x': 60,
            '--right-wing-third-y': 83,
            duration: 0.25
          }, {
            '--rotate': 55,
            '--plane-x': -8,
            '--plane-y': 24,
            duration: 0.2
          }, {
            '--rotate': 40,
            '--plane-x': 45,
            '--plane-y': -180, // Corrected to -180 as requested
            '--plane-opacity': 0,
            duration: 0.3,
            onComplete() {
              // Trigger action
              if (onClick) onClick();
              
              if (targetId) {
                  const element = document.getElementById(targetId);
                  if (element) {
                      element.scrollIntoView({ behavior: 'smooth' });
                  }
              }

              if (href) {
                 setTimeout(() => {
                    router.push(href);
                 }, 500); 
              }

              // Reset button after delay
              setTimeout(() => {
                button.removeAttribute('style');
                gsap.fromTo(button, {
                  opacity: 0,
                  y: -8
                }, {
                  opacity: 1,
                  y: 0,
                  clearProps: true,
                  duration: 0.3,
                  onComplete() {
                    button.classList.remove(styles.active);
                  }
                });
              }, 2000);
            }
          }]
        });

        // Animation 2: Colors and Text
        gsap.to(button, {
          keyframes: [{
            '--text-opacity': 0,
            '--border-radius': 0,
            '--left-wing-background': getVar('--primary-darkest'),
            '--right-wing-background': getVar('--primary-darkest'),
            duration: 0.1
          }, {
            '--left-wing-background': getVar('--primary'),
            '--right-wing-background': getVar('--primary'),
            duration: 0.1
          }, {
            '--left-body-background': getVar('--primary-dark'),
            '--right-body-background': getVar('--primary-darkest'),
            duration: 0.4
          }, {
            '--success-opacity': 1,
            '--success-scale': 1,
            duration: 0.25,
            delay: 0.25
          }]
        });
      }
    };

    button.addEventListener('click', handleClick as any);

    return () => {
      button.removeEventListener('click', handleClick as any);
    };
  }, [router, href, onClick, targetId]);

  return (
    <button ref={buttonRef} className={`${styles.button} ${className || ''}`}>
      <span className={styles.default}>{text}</span>
      <span className={styles.success}>{successText}</span>
      <div className={styles.left}></div>
      <div className={styles.right}></div>
    </button>
  );
};

export default PaperPlaneButton;

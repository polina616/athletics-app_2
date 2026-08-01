"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: Variant;
  icon?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

/** Единая библиотека кнопок — оборачивает нативный <button>, поведение и
 *  обработчики (onClick, type, disabled) не меняются, только визуал. */
const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "secondary", icon = false, className = "", children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        className={`btn ${variantClass[variant]} ${icon ? "btn-icon" : ""} ${className}`}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";

export default Button;

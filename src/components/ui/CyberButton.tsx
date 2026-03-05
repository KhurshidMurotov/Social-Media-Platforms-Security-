import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type CommonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

type CyberButtonAnchorProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type CyberButtonNativeProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

export function CyberButton(props: CyberButtonAnchorProps | CyberButtonNativeProps) {
  const variant = props.variant ?? "primary";
  const classes = `cyber-button cyber-button--${variant} ${props.className ?? ""}`.trim();

  if (typeof (props as CyberButtonAnchorProps).href === "string") {
    const { children, variant: variantProp, className: classNameProp, ...rest } =
      props as CyberButtonAnchorProps;
    void variantProp;
    void classNameProp;
    return (
      <a className={classes} {...rest}>
        {children}
      </a>
    );
  }

  const {
    children,
    variant: variantProp,
    className: classNameProp,
    type = "button",
    ...rest
  } = props as CyberButtonNativeProps;
  void variantProp;
  void classNameProp;
  return (
    <button className={classes} type={type} {...rest}>
      {children}
    </button>
  );
}

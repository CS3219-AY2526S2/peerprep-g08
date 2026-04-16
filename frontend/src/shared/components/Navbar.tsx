import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
} from "@heroui/react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import PeerprepIcon from "../../assets/images/peerprep-logo.png";

import { useLogout } from "../../features/user/hooks/useLogout";

export const PeerprepLogo = () => {
  return (
    <div className="h-16 w-32 overflow-hidden rounded-md">
      <img
        src={PeerprepIcon}
        alt="Peerprep"
        className="h-full w-full object-cover object-center"
      />
    </div>
  );
};

export default function AppNavbar() {
  const location = useLocation();

  const logout = useLogout();

  const navItems = [
    { name: "Dashboard", path: "/" },
    { name: "Questions", path: "/questions" },
    { name: "Profile", path: "/profile" },
  ];

  return (
    <Navbar
      maxWidth="xl"
      classNames={{
        item: [
          "flex",
          "relative",
          "h-full",
          "items-center",
          "data-[active=true]:after:content-['']",
          "data-[active=true]:after:absolute",
          "data-[active=true]:after:bottom-0",
          "data-[active=true]:after:left-0",
          "data-[active=true]:after:right-0",
          "data-[active=true]:after:h-[2px]",
          "data-[active=true]:after:rounded-[2px]",
          "data-[active=true]:after:bg-primary",
        ],
      }}
    >
      <NavbarContent justify="start">
        <NavbarBrand>
          <PeerprepLogo />
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));

          return (
            <NavbarItem key={item.name} isActive={isActive}>
              <Link
                as={RouterLink}
                to={item.path}
                color={isActive ? "primary" : "foreground"}
                aria-current={isActive ? "page" : undefined}
              >
                {item.name}
              </Link>
            </NavbarItem>
          );
        })}
      </NavbarContent>

      <NavbarContent justify="end" className="pr-6">
        <NavbarItem className="lg:flex">
          <Link
            href="#"
            color="danger"
            onClick={(e) => {
              e.preventDefault();
              logout();
            }}
          >
            Log Out
          </Link>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}

export default function DeleteWarning({
    isOpen,
    onClose,
    onConfirm,
    isLoading,
}: Props) {
    return (
        <Modal isOpen={isOpen} onOpenChange={onClose} placement="center">
            <ModalContent>
                <ModalHeader className="text-danger">
                    Delete Account
                </ModalHeader>

                <ModalBody>
                    <p className="text-sm text-gray-600">
                        Are you sure you want to delete your account?
                    </p>
                    <p className="text-sm font-semibold text-danger">
                        This action is permanent and cannot be undone.
                    </p>
                </ModalBody>

                <ModalFooter>
                    <Button variant="flat" onPress={onClose}>
                        Cancel
                    </Button>
                    <Button
                        color="danger"
                        onPress={onConfirm}
                        isLoading={isLoading}
                    >
                        Delete
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
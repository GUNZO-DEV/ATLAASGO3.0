import {
  collection,
  doc,
  serverTimestamp,
  type FirestoreDataConverter,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { Order } from './types';

const orderConverter: FirestoreDataConverter<Order> = {
  toFirestore: (order) => ({ ...order, createdAt: serverTimestamp() }),
  fromFirestore: (snap) => ({ id: snap.id, ...(snap.data() as Omit<Order, 'id'>) }),
};

export const ordersCol = () => collection(db, 'orders').withConverter(orderConverter);
export const orderDoc = (id: string) => doc(db, 'orders', id).withConverter(orderConverter);
export const categoriesCol = () => collection(db, 'categories');

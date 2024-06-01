
import { useParams } from 'react-router-dom';
import {Page} from '../components/Task';

function TaskWrapper() {
    const { id } = useParams<{ id: string }>();
  
    return <Page params={{ taskId: id }} />;
  }

export default TaskWrapper;